from __future__ import annotations
import os
from pydantic import BaseModel

class Settings(BaseModel):
    database_url: str = os.environ.get("DATABASE_URL", "postgresql+psycopg://ops:ops@localhost:5432/ops")
    cors_origins: str = os.environ.get("CORS_ORIGINS", "http://localhost:3000")
    seed_on_start: bool = os.environ.get("SEED_ON_START", "false").lower() == "true"

settings = Settings()
