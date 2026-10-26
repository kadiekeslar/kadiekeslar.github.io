"""Run independently of web requests: python -m backend.jobs.refresh [--limit 3]."""
import argparse
import fcntl
import json
import logging
import time

import httpx
from sqlalchemy import select

from backend.config import ROOT, database_url
from backend.database import Base, BoardState, Job, JobEvent, connect, utcnow
from backend.jobs.providers import ashby, greenhouse, lever
from backend.vectors import Vectors, fingerprint

log = logging.getLogger(__name__)
PROVIDERS = {'greenhouse': greenhouse, 'lever': lever, 'ashby': ashby}


def reconcile(sessions, board, records, allow_large_drop=False):
    """Only called after a complete, validated provider response. One SQL transaction per board."""
    now = utcnow()
    counts = {'found': len(records), 'new': 0, 'changed': 0, 'closed': 0, 'unchanged': 0, 'reopened': 0}
    with sessions() as session:
        existing = {job.external_id: job for job in session.scalars(select(Job).where(
            Job.source == board['provider'], Job.board_key == board['board'])).all()}
        active = sum(job.status != 'CLOSED' for job in existing.values())
        if active and len(records) < active * .5 and not allow_large_drop:
            raise ValueError('Source lost over half its jobs; closure withheld for review (--allow-large-drop)')
        seen, urls = set(), set()
        for fields in records:
            external = fields['external_id']
            # Exact canonical-URL duplicates within a board collapse to one posting.
            if fields['job_url'] in urls:
                continue
            urls.add(fields['job_url'])
            if external in seen:
                raise ValueError('Duplicate external IDs; source may be paginating incorrectly')
            seen.add(external)
            job = existing.get(external)
            event = None
            if job is None:
                job = Job(**fields, status='NEW', first_seen_at=now)
                session.add(job)
                counts['new'] += 1
                event = 'NEW'
            else:
                before = fingerprint(job)
                for key, value in fields.items():
                    setattr(job, key, value)
                if job.status == 'CLOSED':
                    event = 'REOPENED'
                    counts['reopened'] += 1
                    job.status = 'NEW'
                    job.closed_at = None
                else:
                    job.status = 'OPEN'
                if fingerprint(job) != before:
                    counts['changed'] += 1
                else:
                    counts['unchanged'] += 1
            job.last_seen_at = job.last_verified_at = now
            job.content_hash = fingerprint(job)
            session.flush()
            if event:
                session.add(JobEvent(job_id=job.id, event=event, occurred_at=now))
        for external, job in existing.items():
            if external not in seen and job.status != 'CLOSED':
                job.status, job.closed_at = 'CLOSED', now
                session.add(JobEvent(job_id=job.id, event='CLOSED', occurred_at=now))
                counts['closed'] += 1
        key = f'{board["provider"]}:{board["board"]}'
        state = session.get(BoardState, key) or BoardState(key=key, company=board['company'])
        state.checked_at = state.succeeded_at = now
        state.error, state.summary_json = None, json.dumps(counts)
        session.add(state)
        session.commit()
    return counts


def run(limit=None, companies=None, embed=True, allow_large_drop=False, vectors=None):
    engine, sessions = connect(database_url())
    Base.metadata.create_all(engine)
    boards = json.loads((companies or (ROOT / 'companies.json')).read_text())
    if limit:
        boards = boards[:limit]
    results = []
    with httpx.Client(timeout=45, transport=httpx.HTTPTransport(retries=2),
                      headers={'User-Agent': 'OpportunityRadar/1.0 (public job board reader)'}) as client:
        for board in boards:
            try:
                records = PROVIDERS[board['provider']].fetch(client, board)
                result = reconcile(sessions, board, records, allow_large_drop)
                log.info('%s: %s', board['company'], result)
                results.append({'company': board['company'], **result})
            except Exception as exc:
                log.exception('Board failed; previous postings preserved: %s', board['company'])
                with sessions() as session:
                    key = f'{board["provider"]}:{board["board"]}'
                    state = session.get(BoardState, key) or BoardState(key=key, company=board['company'])
                    state.checked_at, state.error = utcnow(), str(exc)[:500]
                    session.add(state)
                    session.commit()
                results.append({'company': board['company'], 'error': str(exc)})
    if embed:
        # Index failures stay pending in VectorState and retry on the next refresh.
        results.append({'embedded_jobs': (vectors or Vectors()).index_pending(sessions)})
    engine.dispose()
    return results


def main():
    from pathlib import Path
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit', type=int)
    parser.add_argument('--companies', type=Path)
    parser.add_argument('--no-embed', action='store_true')
    parser.add_argument('--allow-large-drop', action='store_true')
    parser.add_argument('--loop', action='store_true')
    parser.add_argument('--hours', type=float, default=4)
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    if args.hours < .25:
        parser.error('--hours must be at least 0.25')
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
    (ROOT / 'data').mkdir(exist_ok=True)
    with (ROOT / 'data' / 'refresh.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise SystemExit('Another refresh worker is already running')
        while True:
            try:
                print(json.dumps(run(args.limit, args.companies, not args.no_embed, args.allow_large_drop), indent=2), flush=True)
            except Exception:
                log.exception('Refresh/index failed; retry on next scheduled run')
                if not args.loop:
                    raise
            if not args.loop:
                break
            time.sleep(args.hours * 3600)


if __name__ == '__main__':
    main()
