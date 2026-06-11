# Lume: Roadmap

Phase-by-phase build plan. Each phase has a checklist. Mark items as you ship them. Do not start a new phase until the current one's checklist is fully checked off AND `pnpm typecheck && pnpm lint` passes.

## Phase 0: Setup (Day 1, ~4-6 hours)

Get the skeleton standing up.

- [x] Init pnpm monorepo with Turborepo
- [x] Create `apps/web` (Next.js 15, App Router, TS strict, Tailwind v4, shadcn/ui)
- [x] Create `apps/ingestion` (Hono + Cloudflare Workers, wrangler.toml)
- [x] Create `packages/db` (Drizzle schema + client)
- [x] Create empty `packages/sdk-ts` and `packages/sdk-py` (just `package.json` / `pyproject.toml`, no code yet — Python SDK is post-v1)
- [x] Set up Neon Postgres project. Add `DATABASE_URL` to `.env.local` and Vercel
- [x] Set up `packages/db` with a tiny test schema (just `users` table)
- [x] Run `pnpm db:generate && pnpm db:push` to verify Drizzle works end-to-end
- [x] Deploy `apps/web` to Vercel manually (you, not Claude Code)
- [x] Deploy `apps/ingestion` to Cloudflare Workers manually
- [x] Add `CLAUDE.md`, `PRD.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `CONVENTIONS.md`, `README.md`, `.env.example` to the repo root
- [x] Create `packages/ui` with `package.json`, `src/lib/utils.ts` (`cn()`), and shadcn init config
- [x] Add `.nvmrc` pinning Node 20 LTS
- [x] Create GitHub repo and push (manual — Kartavya)
- [x] Set up GitHub Actions: `typecheck` + `lint` on PR (requires GitHub remote — do after push)
- [x] Monorepo scaffold commit: `chore: scaffold monorepo` (first commit `chore: scaffold docs` already exists)

**Done when:** the empty web app loads on Vercel, the ingestion service returns 200 from `/v1/health` on Cloudflare, and pushing to GitHub runs CI green.

## Phase 1: Auth + Org/Project model (Days 2-3)

Build the multi-tenant skeleton.

- [x] Add Better-Auth to `apps/web` with email + magic link only
- [x] Add `users`, `organizations`, `organization_members`, `projects`, `api_keys` tables to `packages/db`
- [x] Generate + apply migration
- [x] Sign-up flow: email → magic link → land on `/onboarding`
- [x] Onboarding: create first organization with name and slug
- [x] After onboarding: land in `/[orgSlug]` with empty state
- [x] "Create project" CTA: form with name + slug → creates project, lands in `/[orgSlug]/[projectSlug]`
- [x] Project settings page at `/[orgSlug]/[projectSlug]/settings`
- [x] "API Keys" section in settings:
  - [x] Create API key (generate random, hash with sha256, return raw key ONCE in a modal, never again)
  - [x] List existing keys (show only prefix + last 4)
  - [x] Revoke key
- [x] Sidebar nav: org switcher + project switcher
- [x] Top-level `app/(dashboard)/layout.tsx` enforces auth
- [x] Create `apps/web/lib/env.ts`: Zod schema validating all required env vars; crash on startup if any missing

**Done when:** A new user can sign up, create an org, create a project, create an API key, and see it once in a modal. Refreshing the page shows only the prefix.

## Phase 2: Trace ingestion (Days 3-5)

Make the ingestion endpoint accept traces.

- [x] Add `traces`, `spans`, `events` tables to `packages/db`
- [x] Generate + apply migration
- [x] In `apps/ingestion`:
  - [x] Middleware: parse `Authorization: Bearer <api_key>`, hash, look up project. 401 if not found or revoked. Set `last_used_at`.
  - [x] `POST /v1/traces` accepts a trace (with optional nested spans). Validate with Zod. Insert in one transaction.
  - [x] `POST /v1/spans` accepts a single span with `trace_id`. Validate. Insert.
  - [x] `POST /v1/events` accepts an event with `span_id`. Validate. Insert.
  - [x] `POST /v1/batch` accepts mixed payload.
  - [x] Reject payloads > 1MB total. Truncate individual `input`/`output` at 256KB with `truncated: true` flag.
  - [x] `GET /v1/health` returns `{ status: 'ok' }`.
  - [x] API key lookup uses `sha256(incoming_key)` — not bcrypt — to match stored `key_hash`
- [x] Test by hand: hit the ingestion endpoint with `curl` and a project API key. Verify rows land in Postgres.

**Done when:** You can `curl -X POST -H "Authorization: Bearer <key>" -d '<trace>' <ingestion_url>/v1/traces` and see a trace appear in Postgres.

## Phase 3: Trace viewer (Days 5-8)

This is the "Linear UI" moment. Polish hard. It's the project's whole visual identity.

- [x] `/[orgSlug]/[projectSlug]/traces` page:
  - [x] Server component lists traces, paginated (cursor-based), sorted by `started_at desc`
  - [x] Filters: status, free text on name
  - [ ] Filters: time range, user_id_external, latency >, cost > (deferred)
  - [x] Each row: name, status pill, duration, tokens, cost, started_at relative, tags
  - [x] Click row → trace detail (stub page, full detail page below is separate)
- [x] `/[orgSlug]/[projectSlug]/traces/[id]` detail page:
  - [x] Header: name, status, duration, tokens, cost, started_at absolute + relative, tags
  - [x] Span tree: render the parent-child tree of spans with collapse/expand
  - [x] Each span row: icon for type (llm_call, tool_call, agent, retrieval, custom), name, duration bar (gantt-style), status pill
  - [x] Click span → side panel with input/output, metadata, events
  - [x] Input/output: pretty-print JSON, copy button (syntax highlighting deferred)
  - [x] Events: stream of debug/info/warn/error with timestamps and attributes
  - [x] Sticky top bar with "Replay" button (wired in next phase)
- [x] Empty states designed, not skipped
- [x] Mobile rendering does not need to be pretty, but should not crash

**Done when:** You can POST a trace via curl using a project API key, navigate to the trace detail page, and see the span tree render correctly. The real dogfooding test (vs Langfuse) happens at the end of Phase 4 once the SDK exists.

## Phase 4: TypeScript SDK + dogfooding (Days 8-10)

Real instrumentation drives real bug discovery.

- [ ] `packages/sdk-ts`:
  - [x] `Lume` client class with `apiKey`, `baseUrl`, `projectId` (or inferred from key)
  - [x] `lume.trace(name, fn)`: creates a trace, runs `fn` with a tracer context, ends trace on resolve/reject
  - [x] Inside the function: `tracer.span('name', { type: 'llm_call', input, model, ... }, fn)` for spans
  - [x] `tracer.event('message', { level, attributes })` for events
  - [x] Auto-instrumentation helpers: `wrap.openai(client)`, `wrap.anthropic(client)`: proxies that emit spans automatically
  - [x] Batching: queue events in memory, flush every 1s or 100 items
  - [x] Graceful failure: ingestion errors logged once, never throw into user code
  - [x] Configure `tsup` in `packages/sdk-ts` (outputs CJS + ESM + types)
  - [x] Publish to npm as `@lume-kartavya/sdk`
- [ ] Instrument your PR review agent project with `@lume-kartavya/sdk`
- [ ] Watch traces flow into the dashboard for a real workload
- [ ] Fix the bugs you find. There will be bugs.

**Done when:** Your PR review agent emits traces to your local Lume instance. You can look at a real PR review run in the trace viewer.

## Phase 5: Evals v1 (Days 10-13)

The other half of the product.

- [ ] Add `evaluations`, `eval_runs`, `eval_results` tables. Migrate.
- [ ] Set up Inngest:
  - [ ] Create Inngest account
  - [ ] Add Inngest SDK to `apps/web`
  - [ ] Wire up `POST /api/inngest` Inngest webhook endpoint in `apps/web`
  - [ ] Register one function: `runEvalJob({ evalRunId })`
- [ ] `/[orgSlug]/[projectSlug]/evaluations` page:
  - [ ] List evaluations
  - [ ] "Create evaluation" CTA → form: name, rubric prompt, judge model dropdown, target filter (status, time range, tags, span type)
- [ ] Evaluation detail page:
  - [ ] Show rubric and filter
  - [ ] "Run" button → enqueues Inngest job, lands on run progress page
- [ ] `runEvalJob` worker:
  - [ ] Fetches eval definition
  - [ ] Queries traces matching the filter
  - [ ] For each trace, calls the judge model with `rubric_prompt` + trace context (input, output)
  - [ ] Parses judge response (structured output: `{ passed: bool, score?: number, reasoning: string }`)
  - [ ] Writes an `eval_results` row
  - [ ] Updates `eval_runs` progress (`passed++`, `failed++`)
- [ ] Eval run results page:
  - [ ] Pass rate (big number)
  - [ ] Per-trace table: trace name, passed/failed pill, score, reasoning excerpt, link to trace
  - [ ] Filter results to only failures, only passes, etc.
- [ ] Compare view: select two eval runs of the same evaluation, see side-by-side pass rates and per-trace deltas

**Done when:** You can define a rubric, point it at 20 real traces from your PR agent, and get a real pass/fail breakdown back in under 2 minutes.

## Phase 6: Replay (Days 12-14, can run in parallel with Phase 5)

- [ ] `POST /api/replay` handler:
  - [ ] Accepts `{ trace_id, new_model?, new_prompt? }`
  - [ ] Enqueues `runReplayJob` Inngest function
- [ ] `runReplayJob` worker:
  - [ ] Loads original trace
  - [ ] For each `llm_call` span, calls the new model with the new prompt (or original prompt)
  - [ ] Creates a new trace marked as `metadata.replay_of = <original_id>`
  - [ ] Updates job status
- [ ] Replay UI on trace detail page:
  - [ ] "Replay" button → side panel: pick model, optionally edit prompt
  - [ ] Submit → job kicks off, page polls for status
  - [ ] On done: diff view (original trace vs new trace), side by side spans, diff outputs

**Done when:** You can click "Replay" on a trace with `gpt-4o-mini`, pick `claude-haiku-4.5`, and see the diff in 30 seconds.

## Phase 7: Self-host (Day 14)

- [ ] `Dockerfile` for `apps/web`
- [ ] `Dockerfile` for `apps/ingestion` — uses `wrangler dev` as entry point (not a standard Node process; CF Workers apps cannot run as plain containers)
- [ ] `docker-compose.yml` bringing up:
  - [ ] `postgres:16` with `pgvector` (use `pgvector/pgvector:pg16` image)
  - [ ] web app on `:3000`
  - [ ] ingestion on `:8787`
  - [ ] Inngest dev server on `:8288`
- [ ] Self-host README section: env vars, first-run setup, how to create the initial admin user via CLI
- [ ] Test on a fresh machine (cloud VPS) end-to-end

**Done when:** A fresh `git clone && docker compose up` on a VPS gives a working Lume install.

## Phase 8: Launch polish + ship (Day 14)

- [ ] Landing page section in `apps/web` (or separate landing repo)
- [ ] README with screenshots, GIF demo, quick start
- [ ] Open source the repo (MIT license)
- [ ] Write the launch tweet thread (you said no X but write it anyway, you might change your mind)
- [ ] Note: opt-in telemetry ping deferred to post-launch backlog (no implementation path in v1)
- [ ] Post to relevant subreddits (`r/LocalLLaMA`, `r/MachineLearning`, `r/selfhosted`)
- [ ] Submit to Product Hunt
- [ ] Tell the founders you want to work for: link, no pitch

**Done when:** The repo is public, the README looks like a product, and someone other than you has the URL.

## Phase 9 (optional, post-launch): Polish based on feedback

- [ ] Whatever the first 3 users complain about
- [ ] OAuth providers (Google, GitHub) via Better-Auth
- [ ] Real-time tail mode for traces (WebSocket subscription)
- [ ] Cost dashboard
- [ ] Find similar traces (use pgvector finally)
- [ ] Team roles beyond owner/member

## Scope discipline

If during any phase you find yourself about to:

- Add a feature not listed above → STOP. Add it to phase 9 or a future doc.
- Refactor something that "feels wrong" but works → STOP. Open a todo, move on.
- Try to build the "perfect" abstraction → STOP. Ship the concrete one, refactor later when there's a second use case.

The whole product is 14 days. Every hour spent on polish in the wrong phase is an hour stolen from a later phase that needs it more.
