# Lume: Project Context for Claude Code

You are working on **Lume**, an open-source LLM observability + eval tool. Think Langfuse + Promptfoo with a UI that aims for Linear-level polish.

This file is your operating manual. Read it at the start of every session.

> Project name `Lume` is a placeholder. If the user renames it, find-and-replace across the repo.

## Project status

Currently in: **Phase 0: Setup (not started)**

Working roadmap: `ROADMAP.md`. Each phase has a checklist. Mark phases complete as we ship them. Do not start the next phase without confirming this one is done.

## What this product is

A self-hostable tool for AI engineers shipping LLM-powered apps. It lets them:

1. Capture every LLM call and agent step with full context (traces, spans, events).
2. Search and filter traces fast.
3. Replay a trace with a different model or prompt.
4. Define rubrics and run LLM-as-judge evals against captured traces.
5. Self-host in one command via Docker.

Full product spec: `PRD.md`. System design: `ARCHITECTURE.md`.

## Stack (do not change without discussion)

- **Frontend:** Next.js 15 App Router, React 19, TypeScript strict
- **Styling:** Tailwind v4, shadcn/ui, lucide-react
- **Backend (web app):** Next.js API routes
- **Backend (ingestion):** Hono on Cloudflare Workers
- **Database:** Neon Postgres + pgvector
- **ORM:** Drizzle
- **Auth:** Better-Auth
- **Queues / background jobs:** Inngest (free tier)
- **Deploy:** Vercel (web), Cloudflare Workers (ingestion), Neon (db)
- **Monorepo:** Turborepo + pnpm
- **SDKs:** `packages/sdk-ts` (npm), `packages/sdk-py` (pip)

Full rationale in `ARCHITECTURE.md` under Decisions Log.

## Operating rules

Read these before writing code.

1. **Ask before adding dependencies.** Every new package is future maintenance. Justify it in one sentence.
2. **Never run migrations without confirmation.** Show the generated migration file, wait for "ok" before applying.
3. **Never deploy.** Kartavya deploys manually. Never run `vercel`, `wrangler deploy`, or `gh release` on his behalf.
4. **No `any` in TypeScript.** Use `unknown` + narrowing, or define the type. No `@ts-ignore` without a one-line comment explaining why.
5. **Server Components by default.** Only add `"use client"` when interactivity actually requires it.
6. **One concern per file.** Do not pack three features into one route file.
7. **Read `ARCHITECTURE.md` before changing the data model.** If the change isn't documented there, propose a Decisions Log entry first.
8. **Write the smallest test first** for logic worth testing. No "tests later, I promise" energy.
9. **Do not create files Kartavya hasn't asked for.** No `utils.ts`, no `helpers/`, no `types/` directory until something actually needs it.
10. **When uncertain, stop and ask one clarifying question.** Confidently-wrong code costs a debugging session. The user explicitly wants you to challenge fuzzy asks.

## Working style

- Each phase in `ROADMAP.md` should take one or two sessions.
- At the start of a session, state which phase we're on and what the next concrete step is.
- At the end of a session, propose the next step and what's blocking it (if anything).
- If a phase keeps growing in scope, stop and re-scope. Do not push through.

## Multi-file changes

Before a multi-file change:
1. List the files you'll touch and what you'll do in each.
2. Wait for "go".
3. Apply.
4. Show a diff summary.

The user has read `NOTES.md` (which he keeps) and is tracking decisions. He needs to see the boundaries of changes, not just the result.

## Commands

```bash
pnpm dev                 # local dev, all apps
pnpm dev --filter=web    # web app only
pnpm dev --filter=ingestion
pnpm db:generate         # generate Drizzle migration from schema changes
pnpm db:push             # apply migration to Neon (ASK FIRST)
pnpm typecheck           # tsc --noEmit across the monorepo
pnpm lint
pnpm test
```

## Conventions

See `CONVENTIONS.md` for file structure, naming, error patterns, and import rules. Follow them. Don't invent new ones without proposing them.

## When the user switches to Codex CLI

When Claude Code limits hit and the user switches to Codex CLI, at the start of the Codex session:

1. Read this file (`CLAUDE.md`).
2. Read `ROADMAP.md` to see current phase status.
3. Run `git log --oneline -20` to see recent work.
4. Ask the user which step they were on before continuing.

Codex does not inherit Claude Code's session memory. Do not assume continuity.

## Things to challenge the user on

The user is intentionally newer at building solo. If they ask for something that:

- Conflicts with the architecture (`ARCHITECTURE.md`)
- Adds scope to the current phase (`ROADMAP.md`)
- Commits a stack choice not in the Decisions Log
- Mixes concerns into one file
- Skips writing a test for logic that needs one

...push back. Explain why in one paragraph. Suggest the cleaner alternative. They've explicitly asked for this kind of pushback.

## What "done" means for a phase

A phase is done when:
1. All the checklist items in `ROADMAP.md` for that phase are checked.
2. `pnpm typecheck && pnpm lint` passes.
3. The relevant feature is manually verified by the user (you say "ready for you to try X").
4. We update `ROADMAP.md` status before moving on.

Don't claim a phase is "basically done" with broken types or skipped checklist items.
