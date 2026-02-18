from __future__ import annotations
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.db import get_session
from app.models import Alert
from app.schemas import Page
from app.services.audit import write_audit

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("", response_model=Page)
def get_alerts(
    page: int = 1,
    page_size: int = 50,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Alert)
    if status:
        stmt = stmt.where(Alert.status == status)
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if alert_type:
        stmt = stmt.where(Alert.alert_type == alert_type)

    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    stmt = stmt.order_by(Alert.created_at.desc()).offset((page - 1) * min(page_size, 200)).limit(min(page_size, 200))
    items = list(session.exec(stmt).all())
    return Page(items=items, total=int(total), page=page, page_size=min(page_size, 200))

@router.post("/{alert_id}/ack")
def ack_alert(alert_id: uuid.UUID, session: Session = Depends(get_session)):
    alert = session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    before = alert.model_dump()
    alert.status = "acknowledged"
    session.add(alert)
    session.commit()
    session.refresh(alert)
    write_audit(session, actor_user_id=None, entity_type="alert", entity_id=alert.id, action="alert.ack", before=before, after=alert.model_dump())
    return {"alert": alert}

@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: uuid.UUID, payload: dict, session: Session = Depends(get_session)):
    alert = session.get(Alert, alert_id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    before = alert.model_dump()
    reason = payload.get("reason_code") or "resolved"
    alert.status = "resolved"
    session.add(alert)
    session.commit()
    session.refresh(alert)
    after = alert.model_dump()
    after["reason_code"] = reason
    write_audit(session, actor_user_id=None, entity_type="alert", entity_id=alert.id, action="alert.resolve", before=before, after=after)
    return {"alert": alert}
