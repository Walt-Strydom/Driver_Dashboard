from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, Tuple

from sqlmodel import Session, select, func
from app.models import Job, Driver, Vehicle
from app.services.audit import write_audit

def list_jobs(
    session: Session,
    *,
    page: int,
    page_size: int,
    q: Optional[str] = None,
    status: Optional[str] = None,
    customer: Optional[str] = None,
    depot: Optional[str] = None,
    region: Optional[str] = None,
    priority: Optional[str] = None,
    stale_minutes: Optional[int] = None,
) -> Tuple[list[Job], int]:
    stmt = select(Job)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Job.job_code).like(like)
            | func.lower(Job.customer).like(like)
            | func.lower(func.coalesce(Job.pickup_site, "")).like(like)
            | func.lower(func.coalesce(Job.drop_site, "")).like(like)
        )
    if status:
        stmt = stmt.where(Job.status == status)
    if customer:
        stmt = stmt.where(Job.customer == customer)
    if priority:
        stmt = stmt.where(Job.priority == priority)
    if stale_minutes is not None:
        cutoff = datetime.utcnow().timestamp() - stale_minutes * 60
        stmt = stmt.where(func.extract("epoch", Job.last_update_at) < cutoff)

    # depot/region come from assigned driver or vehicle; this is a simple approximation for Phase 1
    if depot:
        stmt = stmt.where(
            Job.driver_id.in_(select(Driver.id).where(Driver.depot == depot))
            | Job.vehicle_id.in_(select(Vehicle.id).where(Vehicle.depot == depot))
        )
    if region:
        stmt = stmt.where(
            Job.driver_id.in_(select(Driver.id).where(Driver.region == region))
            | Job.vehicle_id.in_(select(Vehicle.id).where(Vehicle.region == region))
        )

    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    stmt = stmt.order_by(Job.last_update_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items = list(session.exec(stmt).all())
    return items, int(total)

def assign_job(
    session: Session,
    *,
    job_id: uuid.UUID,
    driver_id: Optional[uuid.UUID],
    vehicle_id: Optional[uuid.UUID],
    actor_user_id: Optional[uuid.UUID],
    override: bool = False,
    override_reason: Optional[str] = None,
) -> Job:
    job = session.get(Job, job_id)
    if not job:
        raise ValueError("Job not found")

    before = job.model_dump()

    # compliance block rule (Phase 1: simple check)
    if not override:
        if driver_id:
            driver = session.get(Driver, driver_id)
            if driver and driver.compliance_state != "ok":
                raise PermissionError("Assignment blocked: driver compliance not ok")
        if vehicle_id:
            vehicle = session.get(Vehicle, vehicle_id)
            if vehicle and vehicle.compliance_state != "ok":
                raise PermissionError("Assignment blocked: vehicle compliance not ok")

    driver = session.get(Driver, driver_id) if driver_id else None
    vehicle = session.get(Vehicle, vehicle_id) if vehicle_id else None

    job.driver_id = driver_id
    job.vehicle_id = vehicle_id
    if job.status == "unassigned" and (driver_id or vehicle_id):
        job.status = "assigned"
    job.last_update_at = datetime.utcnow()
    session.add(job)

    if driver:
        driver.status = "on_job"
        driver.last_update_at = datetime.utcnow()
        session.add(driver)
    if vehicle:
        vehicle.status = "in_use"
        vehicle.last_update_at = datetime.utcnow()
        session.add(vehicle)

    session.commit()
    session.refresh(job)

    after = job.model_dump()
    action = "job.assign"
    if override:
        action = "job.assign_override"
        after["override_reason"] = override_reason

    write_audit(
        session,
        actor_user_id=actor_user_id,
        entity_type="job",
        entity_id=job.id,
        action=action,
        before=before,
        after=after,
    )
    return job
