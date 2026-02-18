from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.db import get_session
from app.models import SavedView
from app.services.saved_views import list_views, upsert_view

router = APIRouter(prefix="/saved-views", tags=["saved-views"])

DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")  # Phase 1 placeholder

@router.get("")
def get_views(module: str, session: Session = Depends(get_session)):
    return {"items": list_views(session, DEFAULT_USER_ID, module)}

@router.post("")
def post_view(payload: dict, session: Session = Depends(get_session)):
    name = payload.get("name")
    module = payload.get("module")
    if not name or not module:
        raise HTTPException(400, "name and module required")

    view = SavedView(
        user_id=DEFAULT_USER_ID,
        module=module,
        name=name,
        filter_json=payload.get("filter_json", "{}"),
        column_set_json=payload.get("column_set_json", "{}"),
        sort_json=payload.get("sort_json", "{}"),
        grouping_json=payload.get("grouping_json", "{}"),
    )
    saved = upsert_view(session, view)
    return {"item": saved}
