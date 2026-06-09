import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Smoke-test table — verifies Drizzle config works end-to-end.
// Remove once Phase 1 Better-Auth migration runs successfully.
export const ping = pgTable("ping", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
