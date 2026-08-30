# ConvoAssemble

> Enterprise-grade **Voting & Meeting Minutes SaaS** for Condominiums and Property Associations.

Built on **Specification-Driven Development (SDD)** — every file traces back to the formal specification.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js Frontend  (Admin Panel + Member Voting UI)          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  TanStack Query  ◄──► Supabase Realtime (WebSockets)   │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │  REST API
┌──────────────────────▼───────────────────────────────────────┐
│  Express/TypeScript Backend  (Clean Architecture + DDD)       │
│  Controller → Use Case → Domain Entity → Repository           │
└──────────────────────┬───────────────────────────────────────┘
                       │  Prisma ORM
┌──────────────────────▼───────────────────────────────────────┐
│  Supabase PostgreSQL  (Multi-tenant via RLS)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │organizations │  │  meetings    │  │     votes        │   │
│  │   (tenants)  │  │   motions    │  │  (immutable)     │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
                  ▲                ▲
          WhatsApp Webhook    Telegram Webhook
          (Meta Cloud API)   (BotFather)
```

## Quick Start

### Prerequisites
- Docker & Docker Compose v2+
- A Supabase project (cloud or local via `npx supabase start`)

### 1. Configure environment
```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, etc.
```

### 2. Run database migrations
```bash
# Apply SQL migrations directly in Supabase SQL Editor:
#   supabase/migrations/001_initial_schema.sql
#
# OR via Prisma (requires DATABASE_URL in .env):
docker compose run --rm prisma-migrate
```

### 3. Start services
```bash
docker compose up --build
```
- **Backend API:**   http://localhost:4000
- **Frontend:**      http://localhost:3000
- **Health check:**  http://localhost:4000/health

### 4. Run unit tests
```bash
cd backend && npm ci && npm test
```

---

## Task Completion Status (SDD Phases)

| Task | Description | Status |
|------|-------------|--------|
| ✅ Task 1 | Docker Compose + DB Schema + Prisma + RLS | **Done** |
| ✅ Task 2 | Backend Use Cases (Meeting, Voting, Quorum) | **Done** |
| ✅ Task 3 | Supabase Realtime frontend + Admin Dashboard + DB test | **Done** |
| ⏳ Task 4 | WhatsApp/Telegram webhook ingestion | Pending |
| ⏳ Task 5 | Admin Dashboard full views + live charts | Pending |

---

## Security Model

- **RLS Policies** — Every table is isolated by `organization_id` extracted from the Supabase JWT claim `org_id`.
- **Immutable Vote Ledger** — `UNIQUE(motion_id, user_id)` constraint at DB level prevents double-voting.
- **Service Role Key** — Used exclusively on the backend server; never exposed to the client.
- **Closed Motion Guard** — Both RLS policy and Use Case layer reject votes against CLOSED motions.
