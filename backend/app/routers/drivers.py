from __future__ import annotations
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.db import get_session
from app.models import Driver, Job
from app.schemas import Page

router = APIRouter(prefix="/drivers", tags=["drivers"])

@router.get("", response_model=Page)
def get_drivers(
    page: int = 1,
    page_size: int = 50,
    q: Optional[str] = None,
    status: Optional[str] = None,
    depot: Optional[str] = None,
    region: Optional[str] = None,
    compliance_state: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Driver)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(Driver.name).like(like) | func.lower(func.coalesce(Driver.staff_id, "")).like(like))
    if status:
        stmt = stmt.where(Driver.status == status)
    if depot:
        stmt = stmt.where(Driver.depot == depot)
    if region:
        stmt = stmt.where(Driver.region == region)
    if compliance_state:
        stmt = stmt.where(Driver.compliance_state == compliance_state)

    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    stmt = stmt.order_by(Driver.last_update_at.desc()).offset((page - 1) * min(page_size, 200)).limit(min(page_size, 200))
    items = list(session.exec(stmt).all())
    return Page(items=items, total=int(total), page=page, page_size=min(page_size, 200))

@router.get("/{driver_id}")
def get_driver(driver_id: uuid.UUID, session: Session = Depends(get_session)):
    driver = session.get(Driver, driver_id)
    if not driver:
        raise HTTPException(404, "Driver not found")
    current_job = session.exec(select(Job).where(Job.driver_id == driver.id).order_by(Job.last_update_at.desc())).first()
    return {"driver": driver, "current_job": current_job}
