import hashlib
import hmac
import re
import secrets
from datetime import timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import select

from backend.database import LoginSession, User, utcnow


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return salt + ':' + digest


def credentials(email, password):
    email = email.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email) or len(email) > 254:
        raise HTTPException(422, 'Enter a valid email address')
    if not 10 <= len(password) <= 256:
        raise HTTPException(422, 'Use a password between 10 and 256 characters')
    return email


def issue(session, user):
    token = secrets.token_urlsafe(32)
    session.add(LoginSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.id,
                             expires_at=utcnow() + timedelta(days=7)))
    session.commit()
    return token


def identify(session, authorization, required=True):
    token = authorization.removeprefix('Bearer ') if authorization else ''
    record = session.get(LoginSession, hashlib.sha256(token.encode()).hexdigest()) if token else None
    if record and record.expires_at.replace(tzinfo=timezone.utc) > utcnow():
        return session.get(User, record.user_id)
    if required:
        raise HTTPException(401, 'Sign in to use your profile, resume, or tracker')
    return None


def login(session, email, password):
    email = credentials(email, password)
    user = session.scalar(select(User).where(User.email == email))
    # A fixed-cost dummy hash prevents a cheap user-enumeration timing path.
    stored = user.password_hash if user else password_hash('dummy-password', '0' * 32)
    valid = hmac.compare_digest(stored, password_hash(password, stored.split(':')[0]))
    if not user or not valid:
        raise HTTPException(401, 'Email or password is incorrect')
    return user
