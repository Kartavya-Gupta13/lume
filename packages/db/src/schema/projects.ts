import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid, index, unique } from "drizzle-orm/pg-core";
import { organization } from "./orgs";

export const project = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("project_org_slug_unique").on(table.organizationId, table.slug),
    index("project_org_idx").on(table.organizationId),
  ],
);

export const projectRelations = relations(project, ({ one }) => ({
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
  }),
}));
