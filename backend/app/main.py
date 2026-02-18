from __future__ import annotations
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, jobs, drivers, vehicles, alerts, audit, saved_views, reports, webhooks
from app.realtime import hub

app = FastAPI(title="Ops Console API", version="0.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(jobs.router)
app.include_router(drivers.router)
app.include_router(vehicles.router)
app.include_router(alerts.router)
app.include_router(audit.router)
app.include_router(saved_views.router)
app.include_router(reports.router)
app.include_router(webhooks.router)

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await hub.connect(ws)
    try:
        while True:
            # clients may send keep-alive pings; ignore payload
            await ws.receive_text()
    except Exception:
        pass
    finally:
        await hub.disconnect(ws)
