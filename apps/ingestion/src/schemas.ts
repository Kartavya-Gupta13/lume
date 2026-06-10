import { z } from "zod";
import {
  traceStatusEnum,
  spanTypeEnum,
  spanStatusEnum,
  eventLevelEnum,
} from "@workspace/db";

const isoDateTime = z.string().datetime({ offset: true });

export const eventInputSchema = z.object({
  timestamp: isoDateTime,
  level: z.enum(eventLevelEnum.enumValues),
  message: z.string(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const spanInputSchema = z.object({
  id: z.string().uuid(),
  parentSpanId: z.string().uuid().optional(),
  name: z.string(),
  type: z.enum(spanTypeEnum.enumValues),
  status: z.enum(spanStatusEnum.enumValues),
  startedAt: isoDateTime,
  endedAt: isoDateTime.optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  error: z.unknown().optional(),
  model: z.string().optional(),
  tokensInput: z.number().int().optional(),
  tokensOutput: z.number().int().optional(),
  costUsd: z.number().optional(),
  latencyMs: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  events: z.array(eventInputSchema).optional(),
});

export const traceInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(traceStatusEnum.enumValues),
  startedAt: isoDateTime,
  endedAt: isoDateTime.optional(),
  totalTokensInput: z.number().int().optional(),
  totalTokensOutput: z.number().int().optional(),
  totalCostUsd: z.number().optional(),
  latencyMs: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  userIdExternal: z.string().optional(),
  tags: z.array(z.string()).optional(),
  spans: z.array(spanInputSchema).optional(),
});

export const spanWithTraceIdSchema = spanInputSchema.extend({
  traceId: z.string().uuid(),
});

export const eventWithSpanIdSchema = eventInputSchema.extend({
  spanId: z.string().uuid(),
});

export const batchSchema = z.object({
  traces: z.array(traceInputSchema).optional(),
  spans: z.array(spanWithTraceIdSchema).optional(),
  events: z.array(eventWithSpanIdSchema).optional(),
});

export type EventInput = z.infer<typeof eventInputSchema>;
export type SpanInput = z.infer<typeof spanInputSchema>;
export type TraceInput = z.infer<typeof traceInputSchema>;
export type SpanWithTraceId = z.infer<typeof spanWithTraceIdSchema>;
export type EventWithSpanId = z.infer<typeof eventWithSpanIdSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
