# Lume: Architecture

## System overview

Three services + shared packages, all in one monorepo.

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│   User's app (their LLM-powered product, anywhere)             │
│        │                                                       │
│        │ uses                                                  │
│        ▼                                                       │
│   ┌─────────────────┐                                          │
│   │ packages/sdk-ts │   ┌─────────────────┐                    │
│   │ packages/sdk-py │──▶│  HTTP POST       │                   │
│   └─────────────────┘   └────────┬────────┘                    │
│                                  │                             │
│                                  ▼                             │
│   ┌─────────────────────────────────────────────┐              │
│   │  apps/ingestion (Hono on Cloudflare Workers)│              │
│   │  - auth via project API key                 │              │
│   │  - validate payload                         │              │
│   │  - insert into Postgres                     │              │
│   └─────────────────────────────────────────────┘              │
│                                  │                             │
│                                  ▼                             │
│   ┌────────────────────────────────────────────────────────┐   │
│   │              Neon Postgres + pgvector                  │   │
│   │  organizations, users, projects, api_keys,             │   │
│   │  traces, spans, events,                                │   │
│   │  evaluations, eval_runs, eval_results                  │   │
│   └────────────────────────────────────────────────────────┘   │
│                  ▲                          ▲                  │
│                  │ reads                    │ reads/writes     │
│                  │                          │                  │
│   ┌──────────────┴──────────┐  ┌────────────┴──────────────┐   │
│   │  apps/web (Next.js)     │  │   Inngest (jobs)          │   │
│   │  - dashboard            │  │   - run eval against      │   │
│   │  - trace viewer         │  │     traces                │   │
│   │  - eval definitions     │  │   - replay traces with    │   │
│   │  - replay UI            │  │     new model/prompt      │   │
│   └─────────────────────────┘  └───────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Why three services and not one

- **Ingestion is high-write, mostly-blind.** It does not need user session context. Putting it on Cloudflare Workers gives us global edge writes, cheap to scale, and isolates failure (if the dashboard goes down, ingestion keeps working).
- **Web app is read-heavy, session-aware.** Next.js on Vercel handles auth, SSR, server actions. Lives close to the database for fast reads.
- **Eval / replay jobs are long-running.** They cannot run in a request handler. Inngest gives us a managed queue with retries on a free tier.

## Data flow

### Ingest a trace

1. User's app calls `lume.trace(name)` returning a tracer.
2. The user wraps an operation: starts spans for LLM calls, tool calls, sub-agents.
3. On `trace.end()`, the SDK POSTs a JSON payload (trace + nested spans + events) to `POST /v1/traces` on the ingestion service, authed with the project's API key.
4. Hono validates the payload with Zod, then writes to Postgres in a single transaction.
5. Response: `{ id, status: "ok" }`.

### View a trace

1. User logs into the web app, picks an org + project.
2. `/traces` lists recent traces, paginated, with filters.
3. `/traces/[id]` fetches the trace, its spans, and events. Renders a tree.
4. UI is mostly server components hitting Drizzle directly.

### Replay

1. User clicks "Replay" on a trace and picks a different model.
2. Web app POSTs to `/api/replay` which enqueues an Inngest job with the original trace id and the new model.
3. Inngest worker fetches the original inputs, calls the new model, writes a new trace marked as a replay of the original.
4. UI shows a diff view between the two traces.

### Run an eval

1. User defines an evaluation: name, rubric prompt, judge model, target spans (e.g. all `llm_call` spans in project X over the last 24h, or a specific test set).
2. User clicks "Run".
3. Web app enqueues an Inngest job with the evaluation id and target trace ids.
4. Worker, for each target trace, calls the judge model with the rubric and the trace's input/output. Writes `eval_results` rows.
5. UI shows pass rate, per-trace results with the judge's reasoning, and a comparison view.

## Database schema

Schemas live in `packages/db/schema/`. Drizzle generates migrations into `packages/db/drizzle/`.

```ts
// users
users: {
  id: uuid primary key,
  email: text unique not null,
  name: text,
  created_at: timestamp default now,
}

// organizations
organizations: {
  id: uuid primary key,
  name: text not null,
  slug: text unique not null,
  created_at: timestamp default now,
}

// organization_members (join: users <-> organizations)
organization_members: {
  organization_id: uuid references organizations,
  user_id: uuid references users,
  role: text check in ('owner', 'member') not null,
  created_at: timestamp default now,
  primary key (organization_id, user_id),
}

// projects (an org has many projects)
projects: {
  id: uuid primary key,
  organization_id: uuid references organizations not null,
  name: text not null,
  slug: text not null,
  created_at: timestamp default now,
  unique (organization_id, slug),
}

// api_keys (each project can have multiple)
api_keys: {
  id: uuid primary key,
  project_id: uuid references projects not null,
  key_hash: text not null,           // store hash, not key
  prefix: text not null,             // last 4 chars for UI display
  name: text not null,
  created_at: timestamp default now,
  last_used_at: timestamp,
  revoked_at: timestamp,
}

// traces (the parent entity for one logical agent run / LLM op)
traces: {
  id: uuid primary key,
  project_id: uuid references projects not null,
  name: text not null,
  status: text check in ('ok', 'error', 'in_progress') not null,
  started_at: timestamp not null,
  ended_at: timestamp,
  total_tokens_input: integer,
  total_tokens_output: integer,
  total_cost_usd: numeric(10, 6),
  latency_ms: integer,
  metadata: jsonb,                   // freeform user-supplied
  user_id_external: text,            // user id from the caller's app
  tags: text[],
  created_at: timestamp default now,
}

// spans (nodes within a trace: llm calls, tool calls, sub-agents)
spans: {
  id: uuid primary key,
  trace_id: uuid references traces not null,
  parent_span_id: uuid references spans,   // nullable, for nested spans
  name: text not null,
  type: text check in ('llm_call', 'tool_call', 'agent', 'retrieval', 'custom') not null,
  status: text check in ('ok', 'error') not null,
  started_at: timestamp not null,
  ended_at: timestamp,
  input: jsonb,
  output: jsonb,
  error: jsonb,
  model: text,                        // for llm_call type
  tokens_input: integer,
  tokens_output: integer,
  cost_usd: numeric(10, 6),
  latency_ms: integer,
  metadata: jsonb,
  created_at: timestamp default now,
}

// events (point-in-time log entries within a span)
events: {
  id: uuid primary key,
  span_id: uuid references spans not null,
  timestamp: timestamp not null,
  level: text check in ('debug', 'info', 'warn', 'error') not null,
  message: text not null,
  attributes: jsonb,
}

// evaluations (rubric definitions)
evaluations: {
  id: uuid primary key,
  project_id: uuid references projects not null,
  name: text not null,
  rubric_prompt: text not null,
  judge_model: text not null,         // e.g. "claude-sonnet-4-5"
  target_filter: jsonb,               // serialized filter for which spans to eval
  created_at: timestamp default now,
}

// eval_runs (executions of an evaluation)
eval_runs: {
  id: uuid primary key,
  evaluation_id: uuid references evaluations not null,
  status: text check in ('pending', 'running', 'completed', 'failed') not null,
  started_at: timestamp not null,
  completed_at: timestamp,
  total_traces: integer,
  passed: integer,
  failed: integer,
}

// eval_results (per-trace result of an eval run)
eval_results: {
  id: uuid primary key,
  eval_run_id: uuid references eval_runs not null,
  trace_id: uuid references traces not null,
  passed: boolean not null,
  score: numeric(5, 4),               // if rubric returns numeric score
  reasoning: text,                     // judge's explanation
  created_at: timestamp default now,
}
```

### Indexes (critical for v1)

```
traces (project_id, started_at desc)        -- list page main query
traces (project_id, status)                 -- filter by status
spans (trace_id)                            -- load all spans for a trace
spans (parent_span_id)                      -- build the tree
events (span_id, timestamp)                 -- load events for a span
eval_results (eval_run_id)
eval_results (trace_id)
api_keys (key_hash)                         -- auth lookup
```

### Notes on schema

- We store inputs and outputs as `jsonb`. Big payloads can blow Postgres up. In v1 we'll cap individual `input`/`output` at 256KB at ingestion time and store a `truncated: true` flag in the column when capped. Later, large payloads go to object storage (R2) with a reference.
- `metadata` is freeform `jsonb` on traces and spans. Encourages users to attach whatever they want.
- pgvector is included in the stack but unused in v1. We add it when we ship "find similar traces" in v1.5.

## API contracts

### Ingestion (`apps/ingestion`, Cloudflare Workers, Hono)

All ingestion routes require `Authorization: Bearer <api_key>`.

```
POST /v1/traces
  body: {
    name: string,
    status: 'ok' | 'error' | 'in_progress',
    started_at: ISO string,
    ended_at?: ISO string,
    user_id_external?: string,
    tags?: string[],
    metadata?: object,
    spans?: Span[],         // optional nested ingest
  }
  returns: { id: uuid, status: 'ok' }

POST /v1/spans
  body: Span (with trace_id required)
  returns: { id: uuid, status: 'ok' }

POST /v1/events
  body: Event (with span_id required)
  returns: { id: uuid, status: 'ok' }

POST /v1/batch
  body: { traces?: Trace[], spans?: Span[], events?: Event[] }
  returns: { ingested: { traces, spans, events } }

GET /v1/health
  returns: { status: 'ok' }
```

### Web app (`apps/web`, Next.js API routes + server actions)

All routes require an authenticated session.

```
GET  /api/projects
GET  /api/projects/:slug
POST /api/projects                           // create a project
POST /api/projects/:slug/api-keys            // create an API key (returns key once)
DELETE /api/api-keys/:id                     // revoke

GET  /api/traces?project=...&q=...&...       // list with filters
GET  /api/traces/:id                         // trace + spans + events

POST /api/replay                             // body: { trace_id, new_model?, new_prompt? }
GET  /api/replay/:id                         // replay status + result

POST /api/evaluations                        // create rubric
GET  /api/evaluations?project=...
POST /api/evaluations/:id/run                // kick off run
GET  /api/evaluations/:id/runs               // history
GET  /api/eval-runs/:id                      // results
```

## Repository layout

```
.
├── apps/
│   ├── web/                    # Next.js 15 dashboard
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── [orgSlug]/
│   │   │   │   │   ├── [projectSlug]/
│   │   │   │   │   │   ├── traces/
│   │   │   │   │   │   ├── evaluations/
│   │   │   │   │   │   └── settings/
│   │   │   ├── api/
│   │   ├── components/
│   │   └── lib/
│   └── ingestion/              # Hono on Cloudflare Workers
│       ├── src/
│       │   ├── index.ts        # Hono app
│       │   ├── routes/
│       │   ├── auth.ts
│       │   └── validation.ts
│       └── wrangler.toml
├── packages/
│   ├── db/                     # shared Drizzle schema + client
│   │   ├── schema/
│   │   ├── drizzle/
│   │   └── index.ts
│   ├── sdk-ts/                 # TypeScript SDK (published to npm)
│   │   ├── src/
│   │   └── package.json
│   ├── sdk-py/                 # Python SDK (published to PyPI)
│   │   ├── lume/
│   │   └── pyproject.toml
│   └── ui/                     # shared shadcn components (optional)
├── turbo.json
├── pnpm-workspace.yaml
├── docker-compose.yml          # for self-host
└── package.json
```

## Decisions log

Every architectural decision lives here with date and one-line rationale. Append-only.

| Date       | Decision                                                  | Rationale                                                                                       |
| ---------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 2026-06-08 | Postgres only for v1, no ClickHouse                       | Neon free tier is generous, fewer moving parts, easier self-host. Can migrate to CH if throughput becomes a real problem. |
| 2026-06-08 | Ingestion on Cloudflare Workers via Hono                  | Edge writes, isolated failure, scales linearly, free tier covers v1 traffic.                    |
| 2026-06-08 | Drizzle over Prisma                                       | Smaller, faster, more control over generated SQL, better edge runtime support.                  |
| 2026-06-08 | Better-Auth over NextAuth                                 | More modern API, less boilerplate, no provider lock-in.                                         |
| 2026-06-08 | Inngest over BullMQ                                       | Managed, no Redis to host, free tier sufficient for v1.                                         |
| 2026-06-08 | LLM-as-judge for v1 evals, no human eval queue            | Solo build, no users yet. LLM judge is the right v1 scope.                                      |
| 2026-06-08 | jsonb for input/output with 256KB cap                     | Simple. Move to R2 with reference for larger payloads in v1.5.                                  |
| 2026-06-08 | pgvector included but unused in v1                        | "Find similar traces" is post-launch. Including extension now avoids a later migration.         |
| 2026-06-08 | Better-Auth email + magic link only                       | Skip OAuth in v1. Add Google/GitHub in v1.5.                                                    |

When a new decision comes up:
1. Propose it.
2. Wait for the user to confirm.
3. Add it to this table before changing code.

## Environment variables

See `CONVENTIONS.md` for the canonical `.env.example`. Never commit real values. Never log them.

## Self-hosting

`docker compose up` brings up:
- Postgres 16 with pgvector extension
- The web app on port 3000
- The ingestion service on port 8787
- Inngest dev server on port 8288

Self-host instructions live in `README.md` once v1 is shipped.
