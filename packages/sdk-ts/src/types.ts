export type TraceStatus = "ok" | "error" | "in_progress";
export type SpanType = "llm_call" | "tool_call" | "agent" | "retrieval" | "custom";
export type SpanStatus = "ok" | "error";
export type EventLevel = "debug" | "info" | "warn" | "error";

export interface EventInput {
  timestamp: string;
  level: EventLevel;
  message: string;
  attributes?: Record<string, unknown>;
}

export interface SpanInput {
  id: string;
  parentSpanId?: string;
  name: string;
  type: SpanType;
  status: SpanStatus;
  startedAt: string;
  endedAt?: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
  events?: EventInput[];
}

export interface TraceInput {
  id: string;
  name: string;
  status: TraceStatus;
  startedAt: string;
  endedAt?: string;
  totalTokensInput?: number;
  totalTokensOutput?: number;
  totalCostUsd?: number;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
  userIdExternal?: string;
  tags?: string[];
  spans?: SpanInput[];
}

export interface SpanWithTraceId extends SpanInput {
  traceId: string;
}

export interface EventWithSpanId extends EventInput {
  spanId: string;
}

export interface BatchInput {
  traces?: TraceInput[];
  spans?: SpanWithTraceId[];
  events?: EventWithSpanId[];
}

export interface LumeOptions {
  apiKey: string;
  baseUrl?: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
}

export interface SpanAttributes {
  type: SpanType;
  input?: unknown;
  output?: unknown;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  metadata?: Record<string, unknown>;
}

export interface EventAttributes {
  level?: EventLevel;
  attributes?: Record<string, unknown>;
}
