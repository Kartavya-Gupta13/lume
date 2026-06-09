import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const memberRoleEnum = pgEnum("member_role", ["owner", "member"]);

export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const organizationMember = pgTable(
  "organization_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("org_member_unique").on(table.organizationId, table.userId),
    index("org_member_org_idx").on(table.organizationId),
    index("org_member_user_idx").on(table.userId),
  ],
);

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(organizationMember),
}));

export const organizationMemberRelations = relations(
  organizationMember,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationMember.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [organizationMember.userId],
      references: [user.id],
    }),
  }),
);
