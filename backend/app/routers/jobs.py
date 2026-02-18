from __future__ import annotations
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import Job, Driver, Vehicle
from app.schemas import Page
from app.services.jobs import list_jobs, assign_job
from app.realtime import hub

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.get("", response_model=Page)
def get_jobs(
    page: int = 1,
    page_size: int = 50,
    q: Optional[str] = None,
    status: Optional[str] = None,
    customer: Optional[str] = None,
    depot: Optional[str] = None,
    region: Optional[str] = None,
    priority: Optional[str] = None,
    stale_minutes: Optional[int] = None,
    session: Session = Depends(get_session),
):
    items, total = list_jobs(
        session,
        page=page,
        page_size=min(page_size, 200),
        q=q,
        status=status,
        customer=customer,
        depot=depot,
        region=region,
        priority=priority,
        stale_minutes=stale_minutes,
    )
    return Page(items=items, total=total, page=page, page_size=min(page_size, 200))

@router.get("/{job_id}")
def get_job(job_id: uuid.UUID, session: Session = Depends(get_session)):
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    driver = session.get(Driver, job.driver_id) if job.driver_id else None
    vehicle = session.get(Vehicle, job.vehicle_id) if job.vehicle_id else None
    return {"job": job, "driver": driver, "vehicle": vehicle}

@router.post("/{job_id}/assign")
async def post_assign(
    job_id: uuid.UUID,
    payload: dict,
    session: Session = Depends(get_session),
):
    driver_id = payload.get("driver_id")
    vehicle_id = payload.get("vehicle_id")
    override = bool(payload.get("override", False))
    override_reason = payload.get("override_reason")

    try:
        job = assign_job(
            session,
            job_id=job_id,
            driver_id=uuid.UUID(driver_id) if driver_id else None,
            vehicle_id=uuid.UUID(vehicle_id) if vehicle_id else None,
            actor_user_id=None,  # Phase 1: auth not implemented
            override=override,
            override_reason=override_reason,
        )
    except PermissionError as e:
        raise HTTPException(409, str(e))
    except ValueError as e:
        raise HTTPException(404, str(e))

    await hub.broadcast_json({"type": "job.updated", "payload": {"id": str(job.id), "status": job.status, "last_update_at": job.last_update_at.isoformat()}})
    return {"job": job}
