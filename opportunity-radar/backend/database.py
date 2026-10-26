from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, String, Text, UniqueConstraint, ForeignKey, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy.pool import StaticPool


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Job(Base):
    __tablename__ = 'jobs'
    __table_args__ = (UniqueConstraint('source', 'board_key', 'external_id'),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    external_id: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(50))
    board_key: Mapped[str] = mapped_column(String(255))
    company: Mapped[str] = mapped_column(String(255), index=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(500))
    job_url: Mapped[str] = mapped_column(Text)
    employment_type: Mapped[str | None] = mapped_column(String(100))
    job_category: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(10), default='NEW', index=True)
    date_posted: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    content_hash: Mapped[str | None] = mapped_column(String(64))


class User(Base):
    __tablename__ = 'users'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    profile_json: Mapped[str] = mapped_column(Text, default='{}')
    resume_text: Mapped[str] = mapped_column(Text, default='')
    last_visit_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LoginSession(Base):
    __tablename__ = 'login_sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Application(Base):
    __tablename__ = 'applications'
    __table_args__ = (UniqueConstraint('user_id', 'job_id'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id'), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'))
    status: Mapped[str] = mapped_column(String(20), default='Saved')
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    applied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str] = mapped_column(Text, default='')
    origin: Mapped[str] = mapped_column(String(30), default='manual')


class BoardState(Base):
    __tablename__ = 'board_states'
    key: Mapped[str] = mapped_column(String(300), primary_key=True)
    company: Mapped[str] = mapped_column(String(255))
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    succeeded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    summary_json: Mapped[str] = mapped_column(Text, default='{}')
    error: Mapped[str | None] = mapped_column(Text)


class JobEvent(Base):
    __tablename__ = 'job_events'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'), index=True)
    event: Mapped[str] = mapped_column(String(20))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class VectorState(Base):
    __tablename__ = 'vector_states'
    job_id: Mapped[str] = mapped_column(ForeignKey('jobs.id'), primary_key=True)
    content_hash: Mapped[str] = mapped_column(String(64))


class Opening(Base):
    __tablename__ = 'openings'
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    company: Mapped[str] = mapped_column(String(255))
    title: Mapped[str] = mapped_column(String(500))
    kind: Mapped[str] = mapped_column(String(20))  # CONFIRMED or EXPECTED, never combined
    date_label: Mapped[str] = mapped_column(String(255))
    source_url: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str] = mapped_column(Text)


def connect(url):
    options = {}
    if url.startswith('sqlite:'):
        options['connect_args'] = {'check_same_thread': False}
        if url == 'sqlite:///:memory:':
            options['poolclass'] = StaticPool
    engine = create_engine(url, **options)
    return engine, sessionmaker(engine, expire_on_commit=False)
