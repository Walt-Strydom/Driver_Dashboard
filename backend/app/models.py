from __future__ import annotations

import json
import uuid
from datetime import datetime, date
from typing import Optional

from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str
    display_name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Role(SQLModel, table=True):
    __tablename__ = "roles"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    description: Optional[str] = None

class UserRole(SQLModel, table=True):
    __tablename__ = "user_roles"
    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True)
    role_id: uuid.UUID = Field(foreign_key="roles.id", primary_key=True)

class Driver(SQLModel, table=True):
    __tablename__ = "drivers"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    staff_id: Optional[str] = Field(default=None, index=True, unique=True)
    depot: Optional[str] = None
    region: Optional[str] = None
    status: str = "off_duty"  # on_duty, on_job, idle, off_duty
    hours_today: int = 0
    hours_week: int = 0
    compliance_state: str = "ok"  # ok, blocked
    last_update_at: datetime = Field(default_factory=datetime.utcnow)

class Vehicle(SQLModel, table=True):
    __tablename__ = "vehicles"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    registration: str = Field(index=True, unique=True)
    fleet_id: Optional[str] = None
    vehicle_class: Optional[str] = None
    depot: Optional[str] = None
    region: Optional[str] = None
    status: str = "available"  # available, in_use, due_service, out_of_service
    next_service_date: Optional[date] = None
    faults_open: int = 0
    compliance_state: str = "ok"
    last_update_at: datetime = Field(default_factory=datetime.utcnow)

class Job(SQLModel, table=True):
    __tablename__ = "jobs"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_code: str = Field(index=True, unique=True)
    priority: str = "normal"  # low, normal, high, critical
    customer: str
    pickup_site: Optional[str] = None
    drop_site: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    eta_at: Optional[datetime] = None
    status: str = "unassigned"  # unassigned, assigned, in_progress, late, completed, failed, cancelled
    sla_minutes_total: int = 240
    sla_started_at: Optional[datetime] = None
    driver_id: Optional[uuid.UUID] = Field(default=None, foreign_key="drivers.id")
    vehicle_id: Optional[uuid.UUID] = Field(default=None, foreign_key="vehicles.id")
    exceptions: Optional[str] = None
    owner_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
    last_update_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Alert(SQLModel, table=True):
    __tablename__ = "alerts"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    severity: str = "medium"  # low, medium, high, critical
    alert_type: str
    entity_type: str  # job/driver/vehicle
    entity_id: Optional[uuid.UUID] = None
    description: str
    owner_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
    status: str = "open"  # open, acknowledged, resolved
    created_at: datetime = Field(default_factory=datetime.utcnow)
    due_by: Optional[datetime] = None

class AuditLogEntry(SQLModel, table=True):
    __tablename__ = "audit_log_entries"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    actor_user_id: Optional[uuid.UUID] = Field(default=None, foreign_key="users.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    entity_type: str
    entity_id: Optional[uuid.UUID] = None
    action: str
    before_json: Optional[str] = None
    after_json: Optional[str] = None
    source: str = "web"
    correlation_id: Optional[str] = None

class SavedView(SQLModel, table=True):
    __tablename__ = "saved_views"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    module: str
    name: str
    filter_json: str = "{}"
    column_set_json: str = "{}"
    sort_json: str = "{}"
    grouping_json: str = "{}"
    created_at: datetime = Field(default_factory=datetime.utcnow)

def to_json(obj) -> str:
    return json.dumps(obj, default=str)
