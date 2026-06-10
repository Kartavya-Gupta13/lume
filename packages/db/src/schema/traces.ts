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
} from "drizzle-orm/pg-core";
import { project } from "./projects";
import { span } from "./spans";

export const traceStatusEnum = pgEnum("trace_status", ["ok", "error", "in_progress"]);

export const trace = pgTable(
  "trace",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: traceStatusEnum("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    totalTokensInput: integer("total_tokens_input"),
    totalTokensOutput: integer("total_tokens_output"),
    totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 6 }),
    latencyMs: integer("latency_ms"),
    metadata: jsonb("metadata"),
    userIdExternal: text("user_id_external"),
    tags: text("tags").array(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("trace_project_idx").on(table.projectId),
    index("trace_started_at_idx").on(table.startedAt),
  ],
);

export const traceRelations = relations(trace, ({ one, many }) => ({
  project: one(project, {
    fields: [trace.projectId],
    references: [project.id],
  }),
  spans: many(span),
}));
