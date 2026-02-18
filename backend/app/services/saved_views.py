from __future__ import annotations
import uuid
from sqlmodel import Session, select
from app.models import SavedView

def list_views(session: Session, user_id: uuid.UUID, module: str) -> list[SavedView]:
    stmt = select(SavedView).where(SavedView.user_id == user_id, SavedView.module == module).order_by(SavedView.created_at.desc())
    return list(session.exec(stmt).all())

def upsert_view(session: Session, view: SavedView) -> SavedView:
    # unique constraint by (user_id, module, name). We'll emulate upsert for portability.
    stmt = select(SavedView).where(SavedView.user_id == view.user_id, SavedView.module == view.module, SavedView.name == view.name)
    existing = session.exec(stmt).first()
    if existing:
        existing.filter_json = view.filter_json
        existing.column_set_json = view.column_set_json
        existing.sort_json = view.sort_json
        existing.grouping_json = view.grouping_json
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    session.add(view)
    session.commit()
    session.refresh(view)
    return view
