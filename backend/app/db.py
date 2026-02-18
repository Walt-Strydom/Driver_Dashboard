from __future__ import annotations
from sqlmodel import create_engine, Session
from app.config import settings

_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(settings.database_url, echo=False, pool_pre_ping=True)
    return _engine

def get_session():
    engine = get_engine()
    with Session(engine) as session:
        yield session
