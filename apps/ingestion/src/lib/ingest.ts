import { eq } from "drizzle-orm";
import { createDbEdge, trace, span, event } from "@workspace/db";
import type { BatchItem } from "drizzle-orm/batch";
import type {
  EventInput,
  SpanInput,
  TraceInput,
  SpanWithTraceId,
  EventWithSpanId,
  BatchInput,
} from "../schemas";

export type Db = ReturnType<typeof createDbEdge>;
type Query = BatchItem<"pg">;

const MAX_FIELD_BYTES = 256 * 1024; // 256KB

export function truncateJsonField(value: unknown, maxBytes = MAX_FIELD_BYTES): unknown {
  if (value === undefined || value === null) return value;
  const json = JSON.stringify(value);
  if (Buffer.byteLength(json, "utf8") <= maxBytes) return value;
  return { truncated: true, data: json.slice(0, maxBytes) };
}

export class NotFoundError extends Error {}

function buildEventInsert(db: Db, spanId: string, input: EventInput) {
  return db.insert(event).values({
    spanId,
    timestamp: new Date(input.timestamp),
    level: input.level,
    message: input.message,
    attributes: input.attributes,
  });
}

function buildSpanInsert(db: Db, traceId: string, input: SpanInput) {
  return db.insert(span).values({
    id: input.id,
    traceId,
    parentSpanId: input.parentSpanId,
    name: input.name,
    type: input.type,
    status: input.status,
    startedAt: new Date(input.startedAt),
    endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
    input: truncateJsonField(input.input),
    output: truncateJsonField(input.output),
    error: truncateJsonField(input.error),
    model: input.model,
    tokensInput: input.tokensInput,
    tokensOutput: input.tokensOutput,
    costUsd: input.costUsd?.toString(),
    latencyMs: input.latencyMs,
    metadata: input.metadata,
  });
}

function buildTraceInsert(db: Db, projectId: string, input: TraceInput) {
  return db.insert(trace).values({
    id: input.id,
    projectId,
    name: input.name,
    status: input.status,
    startedAt: new Date(input.startedAt),
    endedAt: input.endedAt ? new Date(input.endedAt) : undefined,
    totalTokensInput: input.totalTokensInput,
    totalTokensOutput: input.totalTokensOutput,
    totalCostUsd: input.totalCostUsd?.toString(),
    latencyMs: input.latencyMs,
    metadata: input.metadata,
    userIdExternal: input.userIdExternal,
    tags: input.tags,
  });
}

function pushTraceQueries(db: Db, projectId: string, input: TraceInput, queries: Query[]): void {
  queries.push(buildTraceInsert(db, projectId, input));
  for (const s of input.spans ?? []) pushSpanQueries(db, input.id, s, queries);
}

function pushSpanQueries(db: Db, traceId: string, input: SpanInput, queries: Query[]): void {
  queries.push(buildSpanInsert(db, traceId, input));
  for (const e of input.events ?? []) queries.push(buildEventInsert(db, input.id, e));
}

// neon-http has no interactive transactions; db.batch() sends all queries in
// one HTTP round-trip and Neon executes them as a single Postgres transaction.
async function runBatch(db: Db, queries: Query[]): Promise<void> {
  if (queries.length === 0) return;
  await db.batch(queries as [Query, ...Query[]]);
}

async function assertTraceOwnedByProject(db: Db, traceId: string, projectId: string): Promise<void> {
  const [row] = await db
    .select({ projectId: trace.projectId })
    .from(trace)
    .where(eq(trace.id, traceId))
    .limit(1);

  if (!row || row.projectId !== projectId) {
    throw new NotFoundError(`trace not found: ${traceId}`);
  }
}

export async function insertTrace(db: Db, projectId: string, input: TraceInput): Promise<void> {
  const queries: Query[] = [];
  pushTraceQueries(db, projectId, input, queries);
  await runBatch(db, queries);
}

export async function insertSpanForExistingTrace(
  db: Db,
  projectId: string,
  input: SpanWithTraceId,
): Promise<void> {
  await assertTraceOwnedByProject(db, input.traceId, projectId);
  const queries: Query[] = [];
  pushSpanQueries(db, input.traceId, input, queries);
  await runBatch(db, queries);
}

export async function insertEventForExistingSpan(
  db: Db,
  projectId: string,
  input: EventWithSpanId,
): Promise<string> {
  const [row] = await db
    .select({ traceId: span.traceId })
    .from(span)
    .where(eq(span.id, input.spanId))
    .limit(1);

  if (!row) {
    throw new NotFoundError(`span not found: ${input.spanId}`);
  }
  await assertTraceOwnedByProject(db, row.traceId, projectId);

  const [rows] = await db.batch([buildEventInsert(db, input.spanId, input).returning({ id: event.id })]);
  return (rows as { id: string }[])[0]!.id;
}

export async function insertBatch(db: Db, projectId: string, input: BatchInput): Promise<void> {
  const queries: Query[] = [];
  const tracesInBatch = new Set<string>();
  const spansInBatch = new Set<string>();

  for (const t of input.traces ?? []) {
    pushTraceQueries(db, projectId, t, queries);
    tracesInBatch.add(t.id);
    for (const s of t.spans ?? []) spansInBatch.add(s.id);
  }

  for (const s of input.spans ?? []) {
    if (!tracesInBatch.has(s.traceId)) {
      await assertTraceOwnedByProject(db, s.traceId, projectId);
    }
    pushSpanQueries(db, s.traceId, s, queries);
    spansInBatch.add(s.id);
  }

  for (const e of input.events ?? []) {
    if (!spansInBatch.has(e.spanId)) {
      const [row] = await db
        .select({ traceId: span.traceId })
        .from(span)
        .where(eq(span.id, e.spanId))
        .limit(1);

      if (!row) {
        throw new NotFoundError(`span not found: ${e.spanId}`);
      }
      await assertTraceOwnedByProject(db, row.traceId, projectId);
    }
    queries.push(buildEventInsert(db, e.spanId, e));
  }

  await runBatch(db, queries);
}
