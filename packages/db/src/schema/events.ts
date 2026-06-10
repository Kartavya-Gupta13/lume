import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { span } from "./spans";

export const eventLevelEnum = pgEnum("event_level", ["debug", "info", "warn", "error"]);

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spanId: uuid("span_id")
      .notNull()
      .references(() => span.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    level: eventLevelEnum("level").notNull(),
    message: text("message").notNull(),
    attributes: jsonb("attributes"),
  },
  (table) => [index("event_span_idx").on(table.spanId)],
);

export const eventRelations = relations(event, ({ one }) => ({
  span: one(span, {
    fields: [event.spanId],
    references: [span.id],
  }),
}));
