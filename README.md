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
- Backend API: http://localhost:8000/docs (or via proxy `https://dashboard.brandflow.co.za/api/docs`)

## Brandflow deployment (Docker Compose)

This compose file is configured for Brandflow networking:

- joins external Docker network `brandflow-network`
- backend connects to PostgreSQL host `coal-postres` on that network
- primary domain is `https://dashboard.brandflow.co.za`
- frontend proxies API requests from `/api/*` to backend and websocket `/ws`
- n8n CRM integration should call webhook `POST /api/webhooks/crm/job`

Required before launch:

```bash
docker network create brandflow-network || true
export POSTGRES_PASSWORD='<your-db-password>'
docker compose up -d --build
```

Example n8n webhook payload:

```json
{
  "job_code": "JOB-10452",
  "customer": "Acme Mining",
  "status": "assigned",
  "priority": "high",
  "pickup_site": "Witbank Yard",
  "drop_site": "Richards Bay Port",
  "driver_id": "11111111-1111-1111-1111-111111111111",
  "vehicle_id": "22222222-2222-2222-2222-222222222222"
}
```

## Seed data
On first boot, the backend runs migrations and seeds sample data automatically.

## Notes
This is a Phase 1 foundation:
- Authentication/roles are stubbed (simple user table, no login flow yet)
- Dispatch board, map, reports, escalation automation are out of scope for this phase
