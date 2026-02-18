from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from app.db import get_session
from app.models import AuditLogEntry
from app.schemas import Page

router = APIRouter(prefix="/audit", tags=["audit"])

@router.get("", response_model=Page)
def get_audit(
    page: int = 1,
    page_size: int = 50,
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(AuditLogEntry)
    if entity_type:
        stmt = stmt.where(AuditLogEntry.entity_type == entity_type)
    if action:
        stmt = stmt.where(func.lower(AuditLogEntry.action).like(f"%{action.lower()}%"))
    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    stmt = stmt.order_by(AuditLogEntry.timestamp.desc()).offset((page - 1) * min(page_size, 200)).limit(min(page_size, 200))
    items = list(session.exec(stmt).all())
    return Page(items=items, total=int(total), page=page, page_size=min(page_size, 200))
