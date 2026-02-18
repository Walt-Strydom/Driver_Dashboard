from __future__ import annotations
import os
import subprocess
from sqlmodel import Session, select
from datetime import datetime, timedelta, date
import uuid
import random

from app.config import settings
from app.db import get_engine
from app.models import User, Role, UserRole, Driver, Vehicle, Job, Alert
from app.services.audit import write_audit

def run_migrations():
    subprocess.check_call(["alembic", "upgrade", "head"])

def seed():
    engine = get_engine()
    with Session(engine) as session:
        # seed only if empty
        existing = session.exec(select(User)).first()
        if existing:
            return

        admin_user = User(id=uuid.UUID("00000000-0000-0000-0000-000000000001"), email="admin@local", display_name="Admin")
        dispatcher_role = Role(name="dispatcher", description="Can assign and rebalance")
        manager_role = Role(name="manager", description="Can override compliance blocks")
        session.add(admin_user)
        session.add(dispatcher_role)
        session.add(manager_role)
        session.commit()
        session.refresh(dispatcher_role)
        session.refresh(manager_role)

        session.add(UserRole(user_id=admin_user.id, role_id=dispatcher_role.id))
        session.add(UserRole(user_id=admin_user.id, role_id=manager_role.id))
        session.commit()

        depots = ["JHB", "PTA", "DBN", "CPT"]
        regions = ["Gauteng", "KZN", "WC"]
        statuses = ["on_duty", "on_job", "idle", "off_duty"]
        v_statuses = ["available", "in_use", "due_service", "out_of_service"]
        job_statuses = ["unassigned", "assigned", "in_progress", "late", "completed", "failed"]

        drivers = []
        for i in range(40):
            d = Driver(
                name=f"Driver {i+1:02d}",
                staff_id=f"DRV{i+1:04d}",
                depot=random.choice(depots),
                region=random.choice(regions),
                status=random.choice(statuses),
                hours_today=random.randint(0, 11),
                hours_week=random.randint(10, 55),
                compliance_state="blocked" if random.random() < 0.08 else "ok",
            )
            session.add(d)
            drivers.append(d)

        vehicles = []
        for i in range(45):
            v = Vehicle(
                registration=f"REG{i+1:03d} GP",
                fleet_id=f"FLT{i+1:04d}",
                vehicle_class=random.choice(["8t", "14t", "34t", "tanker"]),
                depot=random.choice(depots),
                region=random.choice(regions),
                status=random.choice(v_statuses),
                next_service_date=(date.today() + timedelta(days=random.randint(-10, 90))),
                faults_open=random.randint(0, 4),
                compliance_state="blocked" if random.random() < 0.06 else "ok",
            )
            session.add(v)
            vehicles.append(v)

        session.commit()
        for d in drivers: session.refresh(d)
        for v in vehicles: session.refresh(v)

        customers = ["Acme Mining", "BlueRock", "CoalCo", "Delta Logistics", "Eagle Energy"]
        sites = ["Witbank Yard", "Richards Bay Port", "Vereeniging Depot", "Sasolburg Site", "Kriel Mine", "Secunda Terminal"]
        priorities = ["low", "normal", "high", "critical"]

        now = datetime.utcnow()
        jobs = []
        for i in range(350):
            scheduled = now + timedelta(minutes=random.randint(-720, 1440))
            sla_total = random.choice([180, 240, 360, 480])
            started = scheduled - timedelta(minutes=random.randint(30, 120))
            status = random.choice(job_statuses)
            driver = random.choice(drivers) if random.random() < 0.65 else None
            vehicle = random.choice(vehicles) if random.random() < 0.7 else None

            j = Job(
                job_code=f"JOB-{i+1:05d}",
                priority=random.choice(priorities),
                customer=random.choice(customers),
                pickup_site=random.choice(sites),
                drop_site=random.choice(sites),
                scheduled_at=scheduled,
                eta_at=scheduled + timedelta(minutes=random.randint(30, 240)),
                status=status,
                sla_minutes_total=sla_total,
                sla_started_at=started,
                driver_id=driver.id if driver and status != "unassigned" else None,
                vehicle_id=vehicle.id if vehicle and status != "unassigned" else None,
                exceptions="missing_proof" if random.random() < 0.08 else None,
                owner_user_id=admin_user.id if random.random() < 0.25 else None,
                last_update_at=now - timedelta(minutes=random.randint(0, 180)),
            )
            session.add(j)
            jobs.append(j)

        session.commit()

        # alerts (some open, some resolved)
        alert_types = [
            ("job_late", "job"),
            ("sla_risk", "job"),
            ("missing_proof", "job"),
            ("driver_over_hours", "driver"),
            ("vehicle_due_service_assigned", "vehicle"),
            ("compliance_block", "job"),
        ]
        for i in range(65):
            at, et = random.choice(alert_types)
            related = None
            if et == "job":
                related = random.choice(jobs)
            elif et == "driver":
                related = random.choice(drivers)
            else:
                related = random.choice(vehicles)

            status = "open" if random.random() < 0.75 else "resolved"
            a = Alert(
                severity=random.choice(["low", "medium", "high", "critical"]),
                alert_type=at,
                entity_type=et,
                entity_id=related.id,
                description=f"{at.replace('_',' ').title()} detected",
                owner_user_id=admin_user.id if random.random() < 0.5 else None,
                status=status,
                due_by=now + timedelta(hours=random.randint(2, 48)) if status != "resolved" else None,
                created_at=now - timedelta(hours=random.randint(1, 72)),
            )
            session.add(a)
        session.commit()

        # audit seed: record initial seed event
        write_audit(session, actor_user_id=admin_user.id, entity_type="system", entity_id=None, action="seed.completed", before=None, after={"jobs": 350, "drivers": 40, "vehicles": 45, "alerts": 65})

def main():
    run_migrations()
    if settings.seed_on_start:
        seed()

if __name__ == "__main__":
    main()
