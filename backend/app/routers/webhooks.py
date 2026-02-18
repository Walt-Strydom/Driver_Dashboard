from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import Job
from app.realtime import hub

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/crm/job")
async def crm_job_webhook(payload: dict, session: Session = Depends(get_session)):
    """
    Upsert a job from CRM/n8n workflow events.

    Expected payload (minimum):
      {
        "job_code": "JOB-00001",
        "customer": "Acme Mining",
        "status": "unassigned",
        "priority": "normal",
        "pickup_site": "Witbank Yard",
        "drop_site": "Richards Bay Port",
        "driver_id": "<uuid>",
        "vehicle_id": "<uuid>",
        "exceptions": "missing_proof"
      }
    """
    job_code = payload.get("job_code")
    if not job_code:
        raise HTTPException(400, "job_code is required")

    job = session.exec(select(Job).where(Job.job_code == str(job_code))).first()
    is_created = job is None

    if is_created:
        job = Job(
            job_code=str(job_code),
            customer=str(payload.get("customer") or "Unknown"),
            priority=str(payload.get("priority") or "normal"),
            status=str(payload.get("status") or "unassigned"),
            pickup_site=payload.get("pickup_site"),
            drop_site=payload.get("drop_site"),
            exceptions=payload.get("exceptions"),
        )
    else:
        if payload.get("customer") is not None:
            job.customer = str(payload.get("customer"))
        if payload.get("priority") is not None:
            job.priority = str(payload.get("priority"))
        if payload.get("status") is not None:
            job.status = str(payload.get("status"))
        if payload.get("pickup_site") is not None:
            job.pickup_site = payload.get("pickup_site")
        if payload.get("drop_site") is not None:
            job.drop_site = payload.get("drop_site")
        if payload.get("exceptions") is not None:
            job.exceptions = payload.get("exceptions")

    driver_id = payload.get("driver_id")
    vehicle_id = payload.get("vehicle_id")

    if driver_id is not None:
        try:
            job.driver_id = uuid.UUID(str(driver_id)) if driver_id else None
        except ValueError:
            raise HTTPException(400, "driver_id must be a valid UUID")

    if vehicle_id is not None:
        try:
            job.vehicle_id = uuid.UUID(str(vehicle_id)) if vehicle_id else None
        except ValueError:
            raise HTTPException(400, "vehicle_id must be a valid UUID")

    if payload.get("status") is None and (job.driver_id or job.vehicle_id) and job.status == "unassigned":
        job.status = "assigned"

    job.last_update_at = datetime.utcnow()
    session.add(job)
    session.commit()
    session.refresh(job)

    event_type = "job.created" if is_created else "job.updated"
    await hub.broadcast_json(
        {
            "type": event_type,
            "payload": {
                "id": str(job.id),
                "job_code": job.job_code,
                "status": job.status,
                "source": "n8n.crm.webhook",
                "last_update_at": job.last_update_at.isoformat(),
            },
        }
    )

    if driver_id is not None:
        await hub.broadcast_json(
            {
                "type": "driver.updated",
                "payload": {
                    "id": str(job.driver_id) if job.driver_id else None,
                    "status": "on_job" if job.driver_id else "off_duty",
                    "job_id": str(job.id),
                    "last_update_at": job.last_update_at.isoformat(),
                },
            }
        )

    if vehicle_id is not None:
        await hub.broadcast_json(
            {
                "type": "vehicle.updated",
                "payload": {
                    "id": str(job.vehicle_id) if job.vehicle_id else None,
                    "status": "in_use" if job.vehicle_id else "available",
                    "job_id": str(job.id),
                    "last_update_at": job.last_update_at.isoformat(),
                },
            }
        )

    await hub.broadcast_json(
        {
            "type": "ops.refresh",
            "payload": {
                "entity": "job",
                "action": "created" if is_created else "updated",
                "id": str(job.id),
                "source": "n8n.crm.webhook",
                "last_update_at": job.last_update_at.isoformat(),
            },
        }
    )

    return {
        "created": is_created,
        "job": job,
    }
