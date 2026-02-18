# Ops Console (Phase 1)

Desktop-first operations console for office staff.

Included in this scaffold:
- Desktop layout framework (top bar + left sidebar)
- Jobs module: server-side paging + filtering + split-pane detail
- Drivers and Vehicles modules: tables + split-pane detail
- Alerts queue
- Audit log
- Saved views (per module)

Tech:
- Frontend: React + Vite + TypeScript + TanStack Table + React Router + Zustand
- Backend: FastAPI + SQLModel + Alembic + PostgreSQL
- Realtime: WebSocket broadcast channel (basic)

## Quick start (Docker)

1. Ensure Docker Desktop / Docker Engine + docker compose is installed
2. From the project root:

```bash
docker compose up --build
```

3. Open:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- DB admin (Adminer): http://localhost:8080 (server: `db`, user: `ops`, pass: `ops`, db: `ops`)

## Seed data
On first boot, the backend runs migrations and seeds sample data automatically.

## Notes
This is a Phase 1 foundation:
- Authentication/roles are stubbed (simple user table, no login flow yet)
- Dispatch board, map, reports, escalation automation are out of scope for this phase
