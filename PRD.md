# Lume: Product Requirements (v1)

## One-line pitch

The Linear of LLM observability. A self-hostable tool to trace, search, replay, and evaluate the LLM calls and agent runs inside production AI apps.

## Problem

Building production LLM-powered apps means flying blind. When an agent fails in prod you usually don't know:

- What the model actually saw in context
- Which tool calls happened and in what order
- Why the agent looped, retried, or gave up
- Whether a prompt change made things better or worse against a real test set

Existing tools solve parts of this (Langfuse, Helicone, Braintrust, Promptfoo) but most have dated UIs, force you onto their cloud, or split observability from evals when they belong together.

## Target user

**Primary:** Founding engineers and small AI teams at pre-seed/seed startups shipping LLM-powered products. They want one tool that captures everything and runs evals against it, ideally self-hosted, looking like a product they'd buy.

**Secondary:** Indie devs shipping AI side projects who want observability without paying a per-seat SaaS price.

## Core jobs to be done

1. **Capture.** When my agent runs in prod, capture the full trace: LLM calls, tool calls, sub-agents, retries, token usage, latency, errors.
2. **Find.** When something goes wrong, let me find the relevant trace in under 5 seconds by user id, error, latency, cost, or text search.
3. **Understand.** Show me the trace in a way I can actually read. Tree of spans. Tool calls expanded. Inputs and outputs side by side.
4. **Replay.** Let me re-run a trace with a different model or modified prompt and diff the result.
5. **Evaluate.** Let me define a rubric and run an LLM-as-judge eval against a set of captured traces or a test set. Compare two prompt or model versions on the same eval set.
6. **Self-host.** One docker-compose command to bring the whole thing up locally or on a VPS.

## V1 scope (what we ship in ~14 days)

In:

- Trace ingestion via TS and Python SDKs
- Trace ingestion via raw HTTP endpoint
- Multi-tenant model: organizations → projects → API keys
- Trace list page with search and filter (project, status, latency, cost, time range, free text)
- Trace detail page with span tree, tool call rendering, token usage, latency, cost
- Replay: re-run a trace with a different model or prompt, diff output
- Evals: define a rubric (LLM-as-judge), run it against N traces or a test set, see pass/fail with reasoning
- Compare: run the same eval on two prompt/model versions, see side-by-side pass rate
- Auth: email + magic link via Better-Auth
- Self-host: `docker compose up` brings the whole stack online

Out of v1:

- Real-time alerts (Slack, webhook)
- Detailed cost dashboards beyond per-trace cost
- Team roles and permissions beyond org owner / member
- Mobile-optimized UI
- A hosted SaaS offering (we ship the open-source repo; hosted comes later if there's demand)
- Browser/computer-use trace replay
- Custom OpenTelemetry exporter (we'll accept OTLP shape but won't reverse it for full compatibility in v1)

## Success criteria

- 100 GitHub stars in the first 30 days post-launch
- 10 unique self-host deployments (counted manually via GitHub Issues / Discord pings post-launch — opt-in telemetry deferred to v1.5)
- I instrument my own PR review agent and scratchpad with it and use it daily
- 3 people who aren't me try it and give feedback within 30 days

## Non-goals

- Becoming a general APM (we're scoped to LLM apps, not generic services)
- Training models, finetuning models, hosting models, or routing requests between providers
- A "marketplace" of pre-built evals (later, maybe)
- Replacing OpenTelemetry as a standard. We're compatible-ish, not a replacement.

## Why this can win against the existing tools

1. **UI quality.** The bar is low. Most observability tools look like Grafana 2017. Linear-quality UI is a real wedge.
2. **Single tool for obs + evals.** Most stacks today are Langfuse + Promptfoo + a homegrown comparison script. Combining them removes a real source of friction.
3. **Self-host first.** Many AI startups won't ship customer prompts and outputs to a third-party SaaS. We're built for that constraint from day one.
4. **Built by someone using it.** Eating our own dog food on two other AI projects (PR review agent, scratchpad) catches the real pain points before users do.

## Anti-success patterns to avoid

- Over-engineering the trace data model to handle every imaginable agent shape in v1
- Building cost dashboards before anyone has asked for cost dashboards
- Spending time on collaboration features before there are users to collaborate
- Building a hosted SaaS dashboard before the open-source self-host works smoothly
- Re-implementing OpenTelemetry from scratch
