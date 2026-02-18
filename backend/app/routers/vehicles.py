from __future__ import annotations
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.db import get_session
from app.models import Vehicle, Job
from app.schemas import Page

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

@router.get("", response_model=Page)
def get_vehicles(
    page: int = 1,
    page_size: int = 50,
    q: Optional[str] = None,
    status: Optional[str] = None,
    depot: Optional[str] = None,
    region: Optional[str] = None,
    vehicle_class: Optional[str] = None,
    compliance_state: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Vehicle)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(func.lower(Vehicle.registration).like(like) | func.lower(func.coalesce(Vehicle.fleet_id, "")).like(like))
    if status:
        stmt = stmt.where(Vehicle.status == status)
    if depot:
        stmt = stmt.where(Vehicle.depot == depot)
    if region:
        stmt = stmt.where(Vehicle.region == region)
    if vehicle_class:
        stmt = stmt.where(Vehicle.vehicle_class == vehicle_class)
    if compliance_state:
        stmt = stmt.where(Vehicle.compliance_state == compliance_state)

    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    stmt = stmt.order_by(Vehicle.last_update_at.desc()).offset((page - 1) * min(page_size, 200)).limit(min(page_size, 200))
    items = list(session.exec(stmt).all())
    return Page(items=items, total=int(total), page=page, page_size=min(page_size, 200))

@router.get("/{vehicle_id}")
def get_vehicle(vehicle_id: uuid.UUID, session: Session = Depends(get_session)):
    vehicle = session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")
    current_job = session.exec(select(Job).where(Job.vehicle_id == vehicle.id).order_by(Job.last_update_at.desc())).first()
    return {"vehicle": vehicle, "current_job": current_job}
