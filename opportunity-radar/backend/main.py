"""Opportunity Radar API. Refreshing ATS boards happens only in the separate worker."""
import hashlib
import io
import json
import os
import threading
import time
from contextlib import asynccontextmanager
from datetime import date, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, File, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl
from pypdf import PdfReader
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from backend.auth import credentials, identify, issue, login, password_hash
from backend.config import database_url
from backend.database import Application, Base, BoardState, Job, LoginSession, Opening, User, connect, utcnow
from backend.matching import decision, eligibility, resume_sections
from backend.schemas import JobOut
from backend.vectors import Vectors, fingerprint


class Credentials(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=10, max_length=256)


class Profile(BaseModel):
    name: str = Field('', max_length=120)
    school: str = Field('', max_length=200)
    major: str = Field('', max_length=200)
    graduation_date: date | None = None
    preferred_roles: str = Field('', max_length=500)
    preferred_locations: str = Field('', max_length=500)
    years_experience: int | None = Field(None, ge=0, le=60)
    needs_sponsorship: bool | None = None


class PublicJob(BaseModel):
    company: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=2, max_length=500)
    description: str = Field(min_length=80, max_length=60000)
    location: str | None = Field(None, max_length=500)
    job_url: HttpUrl
    employment_type: str | None = Field(None, max_length=100)


class StatusUpdate(BaseModel):
    status: Literal['Saved', 'Applied', 'Interview', 'Rejected', 'Offer', 'Withdrawn']
    notes: str | None = Field(None, max_length=10000)


def create_app(db_url=None, vector_path=None, vector_factory=Vectors):
    engine, sessions = connect(db_url or database_url())
    write_lock = threading.Lock()
    failures = {}

    @asynccontextmanager
    async def lifespan(app):
        Base.metadata.create_all(engine)
        app.state.vectors = vector_factory(vector_path)
        stop = threading.Event()
        worker = None
        if db_url is None and os.getenv('AUTO_REFRESH', '1') == '1':
            # A dedicated background thread, never a request handler. Reuse the same
            # embedded Chroma client to avoid concurrent processes writing its index.
            def scheduled_refresh():
                import fcntl
                import logging
                from backend.config import ROOT
                from backend.jobs.refresh import run
                while not stop.is_set():
                    try:
                        with (ROOT / 'data' / 'refresh.lock').open('w') as lock:
                            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                            with write_lock:
                                run(vectors=app.state.vectors)
                    except Exception:
                        logging.exception('Background refresh failed; retained existing data')
                    stop.wait(max(900, float(os.getenv('REFRESH_HOURS', '4')) * 3600))
            worker = threading.Thread(target=scheduled_refresh, name='job-refresh', daemon=True)
            worker.start()
        yield
        stop.set()
        if worker:
            worker.join(timeout=2)
        engine.dispose()

    app = FastAPI(title='Opportunity Radar', version='1.0.0', lifespan=lifespan)
    app.state.engine, app.state.sessions = engine, sessions
    app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in os.getenv('CORS_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173,https://kadiekeslar.github.io').split(',') if x.strip()],
        allow_methods=['GET', 'POST', 'PUT', 'DELETE'], allow_headers=['Authorization', 'Content-Type'])

    def user_out(user):
        return {'id': user.id, 'email': user.email, 'profile': json.loads(user.profile_json),
                'has_resume': bool(user.resume_text), 'last_visit_at': user.last_visit_at}

    def present(job):
        result = JobOut.model_validate(job).model_dump(mode='json')
        result['source_label'] = 'User supplied · not source verified' if job.source == 'manual' else job.source.title()
        return result

    def current_filters(status='current', company=None, location=None, employment_type=None, days=None, student=False):
        statement = select(Job)
        statement = statement.where(Job.status.in_(['NEW', 'OPEN'])) if status == 'current' else statement.where(Job.status == status)
        if company:
            statement = statement.where(Job.company == company)
        if location:
            statement = statement.where(Job.location.icontains(location, autoescape=True))
        if employment_type:
            statement = statement.where(Job.employment_type.ilike(employment_type))
        if days:
            statement = statement.where(Job.first_seen_at >= utcnow() - timedelta(days=days))
        if student:
            statement = statement.where(Job.title.regexp_match('(?i)intern|new grad|early career|university|graduate|entry.level'))
        return statement

    def matches(user, jobs, limit=20):
        parts = app.state.vectors.chunks(user.resume_text)[:12]
        merged = {}
        for part in parts:
            for hit in app.state.vectors.search(part, [job.id for job in jobs], limit=limit):
                if hit['job_id'] not in merged or hit['distance'] < merged[hit['job_id']]['distance']:
                    merged[hit['job_id']] = {**hit, 'resume_evidence': part}
        profile = json.loads(user.profile_json)
        by_id = {job.id: job for job in jobs}
        results = []
        for hit in sorted(merged.values(), key=lambda x: x['distance'])[:limit]:
            job = by_id[hit['job_id']]
            eligible = eligibility(job, profile)
            item = present(job)
            results.append({**item, **hit, 'eligibility': eligible,
                            'action': decision(hit['match'], eligible['label'], item['verified_open']),
                            'connection': 'These exact passages are close in embedding space. This is evidence of related subject matter, not proof of a qualification or a hiring probability.'})
        return results

    @app.get('/health')
    def health():
        with sessions() as session:
            session.execute(select(1))
            boards = session.scalars(select(BoardState)).all()
            refresh = max((b.succeeded_at for b in boards if b.succeeded_at), default=None)
            return {'status': 'ok', 'database': 'connected', 'vectors': 'connected',
                    'embedded_chunks': app.state.vectors.jobs.count(),
                    'sources_connected': sum(bool(b.succeeded_at) for b in boards), 'last_refresh_at': refresh}

    @app.post('/auth/register')
    def register(body: Credentials, request: Request):
        throttle(request)
        email = credentials(body.email, body.password)
        with sessions() as session:
            user = User(email=email, password_hash=password_hash(body.password))
            session.add(user)
            try:
                session.commit()
            except IntegrityError:
                raise HTTPException(409, 'This email is already registered. Try signing in.')
            return {'token': issue(session, user), 'user': user_out(user)}

    def throttle(request):
        key = request.client.host
        recent = [t for t in failures.get(key, []) if t > time.monotonic() - 60]
        if len(recent) >= 12:
            raise HTTPException(429, 'Too many attempts. Try again in a minute.')
        failures[key] = recent + [time.monotonic()]

    @app.post('/auth/login')
    def sign_in(body: Credentials, request: Request):
        throttle(request)
        with sessions() as session:
            user = login(session, body.email, body.password)
            previous = user.last_visit_at
            new = session.scalar(select(func.count()).select_from(Job).where(Job.first_seen_at > previous, Job.status != 'CLOSED'))
            user.last_visit_at = utcnow()
            return {'token': issue(session, user), 'user': user_out(user), 'new_since_visit': new}

    @app.post('/auth/logout')
    def logout(authorization: str | None = Header(None)):
        with sessions() as session:
            identify(session, authorization)
            record = session.get(LoginSession, hashlib.sha256(authorization.removeprefix('Bearer ').encode()).hexdigest())
            session.delete(record)
            session.commit()
        return {'ok': True}

    @app.get('/me')
    def me(authorization: str | None = Header(None)):
        with sessions() as session:
            return user_out(identify(session, authorization))

    @app.put('/me')
    def profile(body: Profile, authorization: str | None = Header(None)):
        with sessions() as session:
            user = identify(session, authorization)
            user.profile_json = body.model_dump_json()
            session.commit()
            return user_out(user)

    @app.post('/resume')
    def resume(file: UploadFile = File(...), authorization: str | None = Header(None)):
        with sessions() as session:
            user = identify(session, authorization)
            raw = file.file.read(5 * 1024 * 1024 + 1)
            if len(raw) > 5 * 1024 * 1024:
                raise HTTPException(413, 'Resume must be smaller than 5 MB')
            try:
                if (file.filename or '').lower().endswith('.pdf'):
                    reader = PdfReader(io.BytesIO(raw))
                    if len(reader.pages) > 20:
                        raise ValueError('Too many pages')
                    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
                elif (file.filename or '').lower().endswith('.txt'):
                    text = raw.decode('utf-8')
                else:
                    raise ValueError('Unsupported file')
            except Exception:
                raise HTTPException(422, 'Use a readable PDF or UTF-8 .txt file (up to 20 pages)')
            if not 40 <= len(text.strip()) <= 60000:
                raise HTTPException(422, 'Resume text must be 40–60,000 characters. Scanned PDFs need OCR first.')
            chunks = app.state.vectors.chunks(text)
            vectors = app.state.vectors.resumes
            with write_lock:
                ids = [f'{user.id}:{i}' for i in range(len(chunks))]
                vectors.upsert(ids=ids, documents=chunks, metadatas=[{'user_id': user.id}] * len(chunks))
                old = vectors.get(where={'user_id': user.id})['ids']
                if extra := list(set(old) - set(ids)):
                    vectors.delete(ids=extra)
                user.resume_text = text
                session.commit()
            return {'sections': resume_sections(text), 'chunks': len(chunks), 'characters': len(text)}

    @app.delete('/resume')
    def remove_resume(authorization: str | None = Header(None)):
        with sessions() as session:
            user = identify(session, authorization)
            app.state.vectors.resumes.delete(where={'user_id': user.id})
            user.resume_text = ''
            session.commit()
        return {'ok': True}

    @app.get('/sources')
    def sources():
        with sessions() as session:
            return [{'company': b.company, 'key': b.key, 'checked_at': b.checked_at, 'succeeded_at': b.succeeded_at,
                     'error': b.error, 'summary': json.loads(b.summary_json)} for b in session.scalars(select(BoardState)).all()]

    @app.get('/jobs/new')
    def new_jobs():
        return jobs(q='', status='NEW', company=None, location=None, employment_type=None,
                    days=None, student=False, limit=100, offset=0)

    @app.get('/jobs')
    def jobs(q: str = Query('', max_length=2000), status: Literal['current', 'NEW', 'OPEN', 'CLOSED'] = 'current',
             company: str | None = None, location: str | None = None, employment_type: str | None = None,
             days: int | None = Query(None, ge=1, le=3650), student: bool = False,
             limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0)):
        statement = current_filters(status, company, location, employment_type, days, student)
        with sessions() as session:
            if q.strip():
                records = session.scalars(statement).all()
                hits = app.state.vectors.search(q, [job.id for job in records], limit=100)
                lookup = {job.id: job for job in records}
                return {'items': [{**present(lookup[hit['job_id']]), **hit} for hit in hits[offset:offset+limit]],
                        'total': len(hits), 'semantic': True, 'result_limit': 100}
            total = session.scalar(select(func.count()).select_from(statement.subquery()))
            records = session.scalars(statement.order_by(Job.first_seen_at.desc(), Job.title, Job.id).limit(limit).offset(offset)).all()
            return {'items': [present(job) for job in records], 'total': total, 'semantic': False}

    @app.post('/jobs/import')
    def add_job(body: PublicJob, authorization: str | None = Header(None)):
        from backend.jobs.providers.common import canonical
        with sessions() as session:
            user = identify(session, authorization)
            url = canonical(str(body.job_url))
            duplicate = session.scalar(select(Job).where(Job.job_url == url))
            if duplicate:
                return {'job': present(duplicate), 'duplicate': True}
            fields = body.model_dump(exclude={'job_url'})
            job = Job(**fields, job_url=url, source='manual', board_key='public-submissions',
                      external_id=hashlib.sha256(url.encode()).hexdigest(), status='NEW')
            session.add(job)
            session.commit()
            job.content_hash = fingerprint(job)
            session.commit()
            try:
                with write_lock:
                    app.state.vectors.index_pending(sessions)
            except Exception as exc:
                raise HTTPException(503, 'Job saved, but indexing failed. Run refresh_jobs.py to retry.') from exc
            return {'job': present(job), 'duplicate': False}

    @app.get('/jobs/{job_id}')
    def detail(job_id: str, authorization: str | None = Header(None)):
        with sessions() as session:
            job = session.get(Job, job_id)
            if not job:
                raise HTTPException(404, 'Job not found')
            user = identify(session, authorization, required=False)
            result = present(job)
            result['eligibility'] = eligibility(job, json.loads(user.profile_json) if user else {})
            result['connections'] = matches(user, [job], limit=1) if user and user.resume_text else []
            return result

    @app.get('/recommendations')
    def recommendations(authorization: str | None = Header(None)):
        with sessions() as session:
            user = identify(session, authorization)
            if not user.resume_text:
                raise HTTPException(422, 'Upload a resume first to see your matches')
            # Stale/unverified postings and closed jobs never enter normal recommendations.
            jobs = session.scalars(select(Job).where(Job.status.in_(['NEW', 'OPEN']),
                Job.last_verified_at >= utcnow() - timedelta(hours=24), Job.last_verified_at <= utcnow())).all()
            results = matches(user, jobs, limit=30)
            preferred = json.loads(user.profile_json).get('preferred_roles', '')
            return {'items': results, 'total': len(results), 'explore': sorted({job['job_category'] for job in results if job.get('job_category')}),
                    'preferred_roles': preferred, 'note': 'Ranked across job titles by resume evidence. Review eligibility separately.'}

    @app.post('/jobs/{job_id}/save')
    def save(job_id: str, authorization: str | None = Header(None)):
        return update_application(job_id, StatusUpdate(status='Saved'), authorization, preserve=True)

    @app.post('/jobs/{job_id}/status')
    def status(job_id: str, body: StatusUpdate, authorization: str | None = Header(None)):
        return update_application(job_id, body, authorization)

    def update_application(job_id, body, authorization, preserve=False):
        with sessions() as session:
            user = identify(session, authorization)
            if not session.get(Job, job_id):
                raise HTTPException(404, 'Job not found')
            item = session.scalar(select(Application).where(Application.user_id == user.id, Application.job_id == job_id))
            if item is None:
                item = Application(user_id=user.id, job_id=job_id)
                session.add(item)
            elif preserve:
                return {'ok': True, 'status': item.status}
            item.status = body.status
            if body.notes is not None:
                item.notes = body.notes
            if body.status in ('Applied', 'Interview', 'Rejected', 'Offer', 'Withdrawn') and not item.applied_at:
                item.applied_at = utcnow()
            session.commit()
            return {'ok': True, 'status': item.status}

    @app.get('/applications')
    def applications(authorization: str | None = Header(None)):
        with sessions() as session:
            user = identify(session, authorization)
            rows = session.execute(select(Application, Job).join(Job, Job.id == Application.job_id).where(Application.user_id == user.id).order_by(Application.saved_at.desc())).all()
            return {'items': [{'job': present(job), 'status': item.status, 'notes': item.notes,
                               'saved_at': item.saved_at, 'applied_at': item.applied_at} for item, job in rows],
                    'counts': {status: sum(item.status == status for item, _ in rows) for status in ('Saved', 'Applied', 'Interview', 'Rejected', 'Offer', 'Withdrawn')}}

    @app.get('/opening-soon')
    def openings():
        with sessions() as session:
            return {'items': [{'company': row.company, 'title': row.title, 'kind': row.kind,
                               'date_label': row.date_label, 'source_url': row.source_url, 'evidence': row.evidence,
                               'action': 'PREPARE', 'disclaimer': 'Prediction — not confirmed' if row.kind == 'EXPECTED' else 'Confirmed by linked source'}
                              for row in session.scalars(select(Opening)).all()]}

    @app.get('/stats')
    def stats():
        now = utcnow()
        with sessions() as session:
            def count(*conditions):
                return session.scalar(select(func.count()).select_from(Job).where(*conditions))
            return {'current': count(Job.status != 'CLOSED'), 'verified_open': count(Job.status != 'CLOSED', Job.last_verified_at >= now-timedelta(hours=24)),
                    'new_today': count(Job.status != 'CLOSED', Job.first_seen_at >= now.replace(hour=0,minute=0,second=0,microsecond=0)),
                    'closed': count(Job.status == 'CLOSED'), 'companies': session.scalars(select(Job.company).distinct().order_by(Job.company)).all(),
                    'embedded_chunks': app.state.vectors.jobs.count(), 'day_timezone': 'UTC'}

    return app


app = create_app()
