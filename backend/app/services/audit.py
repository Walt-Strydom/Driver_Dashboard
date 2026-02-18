from __future__ import annotations
import uuid
from typing import Optional, Any
from sqlmodel import Session
from app.models import AuditLogEntry, to_json

def write_audit(
    session: Session,
    *,
    actor_user_id: Optional[uuid.UUID],
    entity_type: str,
    entity_id: Optional[uuid.UUID],
    action: str,
    before: Optional[Any] = None,
    after: Optional[Any] = None,
    source: str = "web",
    correlation_id: Optional[str] = None,
) -> AuditLogEntry:
    entry = AuditLogEntry(
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        before_json=to_json(before) if before is not None else None,
        after_json=to_json(after) if after is not None else None,
        source=source,
        correlation_id=correlation_id,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry
