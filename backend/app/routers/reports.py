from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import Job

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/jobs")
def get_jobs_report(
    days: int = 180,
    session: Session = Depends(get_session),
):
    days = max(30, min(days, 730))
    now = datetime.utcnow()
    start = now - timedelta(days=days)

    jobs = list(session.exec(select(Job).where(Job.created_at >= start)).all())
    all_jobs = list(session.exec(select(Job)).all())

    status_counts = Counter(j.status for j in all_jobs)

    completed_durations = []
    for j in all_jobs:
        if j.status in {"completed", "failed", "cancelled"}:
            created = j.created_at or j.last_update_at
            updated = j.last_update_at or j.created_at
            if created and updated:
                minutes = (updated - created).total_seconds() / 60
                if minutes >= 0:
                    completed_durations.append(minutes)

    avg_resolution_minutes = round(sum(completed_durations) / len(completed_durations), 1) if completed_durations else None

    jobs_by_day = defaultdict(int)
    status_by_day = defaultdict(lambda: Counter())
    priority_counts = Counter()
    customer_counts = Counter()

    for j in jobs:
        if not j.created_at:
            continue
        day_key = j.created_at.date().isoformat()
        jobs_by_day[day_key] += 1
        status_by_day[day_key][j.status] += 1
        priority_counts[j.priority] += 1
        customer_counts[j.customer] += 1

    day_keys = sorted(jobs_by_day.keys())
    daily_volume = [
        {
            "date": d,
            "created": jobs_by_day[d],
            "completed": int(status_by_day[d].get("completed", 0)),
            "failed": int(status_by_day[d].get("failed", 0)),
            "late": int(status_by_day[d].get("late", 0)),
        }
        for d in day_keys
    ]

    monthly_volume = defaultdict(int)
    for j in all_jobs:
        if j.created_at:
            m = j.created_at.strftime("%Y-%m")
            monthly_volume[m] += 1

    month_keys = sorted(monthly_volume.keys())
    monthly_series = [{"month": m, "created": monthly_volume[m]} for m in month_keys]

    top_customers = [{"customer": c, "jobs": n} for c, n in customer_counts.most_common(8)]

    return {
        "window_days": days,
        "generated_at": now.isoformat(),
        "totals": {
            "all_jobs": len(all_jobs),
            "jobs_in_window": len(jobs),
            "open_jobs": sum(status_counts.get(s, 0) for s in ["unassigned", "assigned", "in_progress", "late"]),
            "completed_jobs": int(status_counts.get("completed", 0)),
            "avg_resolution_minutes": avg_resolution_minutes,
        },
        "status_counts": dict(status_counts),
        "priority_counts_window": dict(priority_counts),
        "daily_volume": daily_volume,
        "monthly_volume": monthly_series,
        "top_customers_window": top_customers,
    }
