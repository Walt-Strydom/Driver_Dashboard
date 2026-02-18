from __future__ import annotations
import uuid
from datetime import datetime
from typing import Optional, Any, Dict, List
from pydantic import BaseModel

class Page(BaseModel):
    items: list
    total: int
    page: int
    page_size: int

class JobUpdate(BaseModel):
    id: uuid.UUID
    status: str
    last_update_at: datetime
    driver_id: Optional[uuid.UUID] = None
    vehicle_id: Optional[uuid.UUID] = None

class WsEvent(BaseModel):
    type: str
    payload: Dict[str, Any]
