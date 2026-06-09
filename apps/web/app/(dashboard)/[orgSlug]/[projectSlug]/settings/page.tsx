import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { project, organization, apiKey } from "@workspace/db";
import { ApiKeysSection } from "./api-keys-section";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);

  if (!org) notFound();

  const [proj] = await db
    .select({ id: project.id, name: project.name, slug: project.slug })
    .from(project)
    .where(
      and(eq(project.organizationId, org.id), eq(project.slug, projectSlug)),
    )
    .limit(1);

  if (!proj) notFound();

  const keys = await db
    .select({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      lastFour: apiKey.lastFour,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
    })
    .from(apiKey)
    .where(eq(apiKey.projectId, proj.id))
    .orderBy(apiKey.createdAt);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">{proj.name}</p>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Project details</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex gap-4">
            <span className="w-24 text-muted-foreground">Name</span>
            <span>{proj.name}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-24 text-muted-foreground">Slug</span>
            <span className="font-mono">{proj.slug}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-24 text-muted-foreground">Project ID</span>
            <span className="font-mono text-xs">{proj.id}</span>
          </div>
        </div>
      </section>

      <hr className="border-border" />

      <ApiKeysSection projectId={proj.id} keys={keys} />

      <hr className="border-border" />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Project deletion is not available yet.
        </p>
      </section>
    </div>
  );
}
