import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { project } from "./projects";

export const apiKey = pgTable(
  "api_key",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // sha256 hash of raw key — never store raw key
    keyHash: text("key_hash").notNull().unique(),
    prefix: text("prefix").notNull(),
    lastFour: text("last_four").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("api_key_project_idx").on(table.projectId)],
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  project: one(project, {
    fields: [apiKey.projectId],
    references: [project.id],
  }),
}));
