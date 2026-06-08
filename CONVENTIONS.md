# Lume: Conventions

How we write and organize code in this repo. Claude Code reads this. So do you.

## TypeScript

- `"strict": true` everywhere. Plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- No `any`. Use `unknown` + narrowing if you don't know the type yet.
- No `@ts-ignore` without a comment explaining why on the same line.
- Prefer `interface` for object shapes that might be extended, `type` for unions, mapped types, and inferred shapes.
- Function arguments and return types are explicit on exported functions. Inferred is fine for local closures.
- No default exports except for Next.js page/route/layout files where the framework requires them.

## File and naming

- File names: `kebab-case.ts` (e.g. `trace-viewer.tsx`, `create-project.ts`).
- React component names inside files: `PascalCase`.
- Variables and functions: `camelCase`.
- Constants: `SCREAMING_SNAKE_CASE` for true constants; `camelCase` for config objects.
- Database table names: `snake_case` plural (`users`, `traces`, `api_keys`).
- Database columns: `snake_case`.
- TypeScript types corresponding to tables: `PascalCase` singular (`User`, `Trace`, `ApiKey`).

## Imports

- Path aliases via `tsconfig.json`:
  - `@/` → current app's root (e.g. `apps/web/`)
  - `@workspace/db` → `packages/db`
  - `@workspace/sdk-ts` → `packages/sdk-ts`
  - `@workspace/ui` → `packages/ui`
- No relative imports across package boundaries.
- Within a package: relative imports are fine if shallow (`./component`, `../lib/foo`). Deeper than `../../` is a smell → use the alias.
- Import order:
  1. Node built-ins
  2. External packages
  3. Workspace packages (`@workspace/*`)
  4. Local aliased (`@/`)
  5. Relative
- One blank line between groups. Let Prettier sort within groups.

## Next.js patterns

- Server Components by default. `"use client"` only when a file needs interactivity (state, effects, event handlers, browser APIs).
- Data fetching in Server Components hits Drizzle directly. No API route for data only consumed by your own UI.
- Mutations through Server Actions when they're a form submit. Use API routes when an external caller (SDK, webhook) needs to hit them.
- `loading.tsx` and `error.tsx` for every route group with non-trivial loading.
- `not-found.tsx` for routes with dynamic segments that might not exist.
- Streaming + Suspense where the first chunk matters and slower data can defer.

## Error handling

- Throw `Error` with context as the message: `throw new Error('failed to ingest trace: missing project_id')`. Not bare strings, not error codes.
- For known error categories, define error classes once and reuse: `class IngestionError extends Error`, `class AuthError extends Error`.
- API routes return JSON errors as `{ error: { code: string, message: string } }` with the right HTTP status.
- Server actions throw on failure; client wraps in a try/catch and surfaces via toast.
- Never swallow errors. If you catch, log with context or rethrow.

## Database (Drizzle)

- Schema in `packages/db/schema/*.ts`, one file per logical group (`auth.ts`, `traces.ts`, `evals.ts`).
- Migrations are generated, not hand-written: `pnpm db:generate` after schema changes. Commit the migration.
- Apply migrations: `pnpm db:push`. ASK BEFORE running on a non-empty database.
- Never `drop` or `truncate` in a migration unless explicitly approved.
- Queries: prefer `db.query.traces.findMany({ ... })` (relational API) for reads, `db.insert/update/delete` for writes.
- For complex aggregations, raw SQL via `sql\`\`` is fine but document the intent above it.

## API design

- REST-ish. `GET /api/things`, `GET /api/things/:id`, `POST /api/things`, `PATCH /api/things/:id`, `DELETE /api/things/:id`.
- Versioned ingestion API: `/v1/...`. Don't break v1 contracts after launch.
- All POST/PATCH inputs validated with Zod at the route handler boundary.
- Pagination: cursor-based (`?cursor=<id>&limit=50`). No offset pagination.
- Times in ISO 8601 strings in JSON. Don't serialize Date objects directly.

## React + Tailwind

- Components functional only. No class components.
- Hooks: extract to `hooks/use-x.ts` when reused across 2+ components.
- Tailwind utilities directly in JSX. No `@apply` in CSS files (we want HMR-friendly, grep-friendly classes).
- Use `cn()` from `lib/utils.ts` to merge class names.
- shadcn/ui as the component base. Copy components into `components/ui/`, modify freely.
- Icons from `lucide-react`. Don't bring in a second icon library.
- Colors and spacing through Tailwind tokens, not arbitrary values. Arbitrary (`w-[372px]`) only when no token fits and the value is intentional.

## Testing

- Vitest for unit tests.
- One smoke test per critical path before v1 launch:
  - Auth: sign up → magic link → land on dashboard
  - Ingestion: POST a trace with a valid API key → row in DB
  - Trace viewer: load trace by id → renders spans
  - Eval: define rubric → run → results land
- Write the test before the implementation when adding non-trivial logic.
- No 100% coverage goal. Coverage for coverage's sake is a tax.
- E2E tests deferred to post-v1. Manual QA for the launch.

## Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`.
- Imperative mood: "add trace viewer", not "added trace viewer" or "adds trace viewer".
- Keep commits small. If you can't summarize the change in one line, it's too big.
- Branch off `main`, PR to `main`. No long-lived branches.
- Squash on merge.

## Environment variables

Canonical `.env.example` (see also `/.env.example` at repo root):

```bash
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Auth
BETTER_AUTH_SECRET="generate with: openssl rand -base64 32"
BETTER_AUTH_URL="http://localhost:3000"

# Email (magic links)
RESEND_API_KEY=""
EMAIL_FROM="noreply@yourdomain.com"

# LLM provider keys (server-side only)
ANTHROPIC_API_KEY=""
OPENAI_API_KEY=""
GEMINI_API_KEY=""

# Inngest
INNGEST_EVENT_KEY=""
INNGEST_SIGNING_KEY=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_INGESTION_URL="http://localhost:8787"

# Ingestion service (apps/ingestion, Cloudflare Workers)
# Set via `wrangler secret put`, not in this file
# - DATABASE_URL
```

Rules:
- Never commit a `.env` or `.env.local`. They are gitignored.
- Never `console.log` an env var or any secret-shaped string.
- Validate env vars at startup with Zod (`apps/web/lib/env.ts`). Crash early if a required one is missing.

## When the spec is unclear

If you (Claude Code) don't have enough info to choose:
1. State what you don't know.
2. List the two or three reasonable options with one-line trade-offs.
3. Recommend one.
4. Wait for the user's call.

Don't make up the spec to keep moving. The user wants pushback.
