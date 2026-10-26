from contextlib import asynccontextmanager
from datetime import timedelta
from typing import Literal

import chromadb
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select

from backend.config import chroma_path, database_url
from backend.database import Base, Job, connect, utcnow
from backend.schemas import JobOut
import os


def create_app(db_url=None, vector_path=None):
    engine, sessions = connect(db_url or database_url())

    @asynccontextmanager
    async def lifespan(app):
        Base.metadata.create_all(engine)
        app.state.vectors = chromadb.PersistentClient(path=str(vector_path or chroma_path()))
        # No model download or embeddings yet; Stage 4 supplies the embedding function.
        app.state.jobs_collection = app.state.vectors.get_or_create_collection(
            'jobs', embedding_function=None, metadata={'description': 'Opportunity Radar job embeddings'}
        )
        yield
        engine.dispose()

    app = FastAPI(title='Opportunity Radar', version='0.1.0', lifespan=lifespan)
    app.state.engine = engine
    app.state.sessions = sessions
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[x.strip() for x in os.getenv('CORS_ORIGINS',
            'http://localhost:5173,http://127.0.0.1:5173,https://kadiekeslar.github.io').split(',') if x.strip()],
        allow_methods=['GET'], allow_headers=['*'],
    )

    @app.get('/health')
    def health():
        with sessions() as session:
            session.execute(select(1))
        return {'status': 'ok', 'stage': 1, 'database': 'connected',
                'vectors': 'connected', 'embedded_jobs': app.state.jobs_collection.count(),
                'sources_connected': 0, 'last_refresh_at': None}

    def read_jobs(status, company, location, employment_type, limit, offset):
        statement = select(Job)
        if status == 'current':
            statement = statement.where(Job.status.in_(['NEW', 'OPEN']))
        else:
            statement = statement.where(Job.status == status)
        for column, value in [(Job.company, company), (Job.location, location),
                              (Job.employment_type, employment_type)]:
            if value:
                statement = statement.where(column == value)
        with sessions() as session:
            total = session.scalar(select(func.count()).select_from(statement.subquery()))
            jobs = session.scalars(statement.order_by(Job.first_seen_at.desc(), Job.id).limit(limit).offset(offset)).all()
            return {'items': [JobOut.model_validate(job) for job in jobs], 'total': total}

    @app.get('/jobs/new')
    def new_jobs(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
        return read_jobs('NEW', None, None, None, limit, offset)

    @app.get('/jobs')
    def jobs(status: Literal['current', 'NEW', 'OPEN', 'CLOSED'] = 'current',
             company: str | None = None, location: str | None = None,
             employment_type: str | None = None,
             limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
        return read_jobs(status, company, location, employment_type, limit, offset)

    @app.get('/jobs/{job_id}', response_model=JobOut)
    def job_detail(job_id: str):
        with sessions() as session:
            job = session.get(Job, job_id)
            if job is None:
                raise HTTPException(404, 'Job not found')
            return job

    @app.get('/stats')
    def stats():
        now = utcnow()
        current = [Job.status.in_(['NEW', 'OPEN'])]
        with sessions() as session:
            def count(*conditions):
                return session.scalar(select(func.count()).select_from(Job).where(*conditions))
            return {'current': count(*current),
                    'verified_open': count(*current, Job.last_verified_at >= now - timedelta(hours=24),
                                           Job.last_verified_at <= now),
                    'new_today': count(*current, Job.first_seen_at >= now.replace(hour=0, minute=0, second=0, microsecond=0)),
                    'closed': count(Job.status == 'CLOSED'), 'sources_connected': 0,
                    'last_refresh_at': None, 'day_timezone': 'UTC'}

    return app


app = create_app()
