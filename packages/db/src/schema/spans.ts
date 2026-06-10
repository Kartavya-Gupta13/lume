import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  integer,
  numeric,
  jsonb,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { trace } from "./traces";
import { event } from "./events";

export const spanTypeEnum = pgEnum("span_type", [
  "llm_call",
  "tool_call",
  "agent",
  "retrieval",
  "custom",
]);

export const spanStatusEnum = pgEnum("span_status", ["ok", "error"]);

export const span = pgTable(
  "span",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    traceId: uuid("trace_id")
      .notNull()
      .references(() => trace.id, { onDelete: "cascade" }),
    parentSpanId: uuid("parent_span_id").references((): AnyPgColumn => span.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    type: spanTypeEnum("type").notNull(),
    status: spanStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    input: jsonb("input"),
    output: jsonb("output"),
    error: jsonb("error"),
    model: text("model"),
    tokensInput: integer("tokens_input"),
    tokensOutput: integer("tokens_output"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    latencyMs: integer("latency_ms"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("span_trace_idx").on(table.traceId),
    index("span_parent_idx").on(table.parentSpanId),
  ],
);

export const spanRelations = relations(span, ({ one, many }) => ({
  trace: one(trace, {
    fields: [span.traceId],
    references: [trace.id],
  }),
  parent: one(span, {
    fields: [span.parentSpanId],
    references: [span.id],
    relationName: "span_parent_children",
  }),
  children: many(span, {
    relationName: "span_parent_children",
  }),
  events: many(event),
}));
