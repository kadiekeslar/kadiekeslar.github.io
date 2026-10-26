"""One local embedding model, token-aware chunks, and persistent Chroma collections."""
import hashlib
import logging
import os
from pathlib import Path

import chromadb
from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2
from tokenizers import Tokenizer
from sqlalchemy import select

from backend.config import ROOT, chroma_path
from backend.database import Job, VectorState

log = logging.getLogger(__name__)


def fingerprint(job):
    return hashlib.sha256(f'{job.title}\n{job.company}\n{job.description}'.encode()).hexdigest()


class Vectors:
    def __init__(self, path=None):
        self.client = chromadb.PersistentClient(path=str(path or chroma_path()))
        self.embed = ONNXMiniLM_L6_V2(preferred_providers=['CPUExecutionProvider'])
        self.embed.DOWNLOAD_PATH = Path(os.getenv('MODEL_CACHE_PATH', str(ROOT / 'data' / 'models' / 'all-MiniLM-L6-v2')))
        # Separate from Stage 1's empty untyped collection; never mix dimensions/models.
        self.jobs = self.client.get_or_create_collection('job_chunks_minilm_v1', embedding_function=self.embed,
                                                       metadata={'hnsw:space': 'cosine'})
        self.resumes = self.client.get_or_create_collection('resume_chunks_minilm_v1', embedding_function=self.embed,
                                                          metadata={'hnsw:space': 'cosine'})
        self._tokenizer = None

    def chunks(self, text):
        if self._tokenizer is None:
            # Public call ensures the downloaded model is present; no text leaves this machine.
            self.embed(['Initialize tokenizer'])
            self._tokenizer = Tokenizer.from_file(str(self.embed.DOWNLOAD_PATH / 'onnx' / 'tokenizer.json'))
            self._tokenizer.no_padding()
            self._tokenizer.no_truncation()
        encoded = self._tokenizer.encode(text, add_special_tokens=False)
        offsets = encoded.offsets
        # 220 tokens plus model special tokens stay below its 256-token limit.
        return [text[offsets[i][0]:offsets[min(i + 219, len(offsets)-1)][1]]
                for i in range(0, len(offsets), 190) if offsets[i][1] > offsets[i][0]]

    def index_pending(self, sessions):
        changed = 0
        with sessions() as session:
            records = session.scalars(select(Job)).all()
            for job in records:
                state = session.get(VectorState, job.id)
                digest = fingerprint(job)
                if state and state.content_hash == digest:
                    continue
                chunks = self.chunks(f'{job.title}\n{job.company}\n{job.description}')
                ids = [f'{job.id}:{i}' for i in range(len(chunks))]
                # Upsert first, delete obsolete tail only after success. On failure, hash stays pending.
                for start in range(0, len(chunks), 64):
                    self.jobs.upsert(ids=ids[start:start+64], documents=chunks[start:start+64],
                                     metadatas=[{'job_id': job.id, 'company': job.company}] * len(chunks[start:start+64]))
                old = self.jobs.get(where={'job_id': job.id})['ids']
                obsolete = list(set(old) - set(ids))
                if obsolete:
                    self.jobs.delete(ids=obsolete)
                session.merge(VectorState(job_id=job.id, content_hash=digest))
                session.commit()
                changed += 1
                if changed % 25 == 0:
                    log.info('Embedded %s jobs; %s chunks stored', changed, self.jobs.count())
        return changed

    def search(self, query, eligible_ids=None, limit=20):
        count = self.jobs.count()
        if not count or eligible_ids == []:
            return []
        kwargs = {'where': {'job_id': {'$in': eligible_ids}}} if eligible_ids is not None else {}
        result = self.jobs.query(query_texts=[query], n_results=min(count, max(100, limit * 8)),
                                 include=['documents', 'metadatas', 'distances'], **kwargs)
        best = {}
        for document, meta, distance in zip(result['documents'][0], result['metadatas'][0], result['distances'][0]):
            if distance > 0.78:  # Heuristic relevance gate, never a hiring probability.
                continue
            job_id = meta['job_id']
            if job_id not in best:
                best[job_id] = {'job_id': job_id, 'distance': round(distance, 4), 'evidence': document,
                                'match': 'Excellent Match' if distance < .3 else 'Strong Match' if distance < .48 else 'Possible Match' if distance < .65 else 'Weak Match'}
        return list(best.values())[:limit]
