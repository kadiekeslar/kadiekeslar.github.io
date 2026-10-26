from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, String, Text, UniqueConstraint, create_engine
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


def connect(url):
    options = {}
    if url.startswith('sqlite:'):
        options['connect_args'] = {'check_same_thread': False}
        if url == 'sqlite:///:memory:':
            options['poolclass'] = StaticPool
    engine = create_engine(url, **options)
    return engine, sessionmaker(engine, expire_on_commit=False)
