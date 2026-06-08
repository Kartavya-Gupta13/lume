# Lume

The Linear of LLM observability.

Self-hostable trace viewer + eval runner for production LLM apps. Capture every LLM call and agent step, replay with different models, and run LLM-as-judge evals against real traffic.

> Status: pre-v1. Building in public.

## Why

Building production LLM apps means flying blind. Existing tools work but the UX is dated, most force you onto their cloud, and observability is bolted onto evals (or vice versa) instead of designed as one product.

Lume captures everything, makes it readable, and runs evals against the captured data. Self-host in one command.

## Features (v1)

- **Trace ingestion** via TypeScript and Python SDKs, or raw HTTP
- **Trace viewer** with span tree, tool call rendering, token usage, latency, cost
- **Search and filter** by user, status, error, latency, cost, free text
- **Replay** any trace with a different model or prompt, diff the output
- **Evals** define rubrics and run LLM-as-judge against captured traces or test sets
- **Compare** two prompt or model versions on the same eval set
- **Self-host** via `docker compose up`

## Quick start

```bash
# clone and run
git clone https://github.com/your-handle/lume
cd lume
cp .env.example .env
docker compose up
```

Then in your app:

```ts
import { Lume } from "@lume/sdk";

const lume = new Lume({ apiKey: process.env.LUME_API_KEY });

await lume.trace("answer_user_question", async (tracer) => {
  const result = await tracer.span(
    "llm_call",
    { type: "llm_call", model: "claude-sonnet-4-5", input: { messages } },
    async () => {
      return await anthropic.messages.create({ ... });
    },
  );
  return result;
});
```

## Stack

Next.js 15, TypeScript, Postgres, Drizzle, Hono on Cloudflare Workers, Inngest. MIT licensed.

## Roadmap

See `ROADMAP.md` for the build plan and current phase.

## Architecture

See `ARCHITECTURE.md` for system design, data model, and decisions log.

## Contributing

v1 is being shipped solo. Once v1 is out, contributions welcome via PR. For now, file issues if you find them.

## License

MIT
