import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { project, organization, trace } from "@workspace/db";
import { Badge, type BadgeProps } from "@workspace/ui";
import { formatCost, formatDuration, formatRelativeTime, formatTokens } from "../format";

const STATUS_BADGE_VARIANT: Record<string, BadgeProps["variant"]> = {
  ok: "success",
  error: "destructive",
  in_progress: "pending",
};

export default async function TraceDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; id: string }>;
}) {
  const { orgSlug, projectSlug, id } = await params;

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);

  if (!org) notFound();

  const [proj] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.organizationId, org.id), eq(project.slug, projectSlug)))
    .limit(1);

  if (!proj) notFound();

  const [t] = await db
    .select()
    .from(trace)
    .where(and(eq(trace.id, id), eq(trace.projectId, proj.id)))
    .limit(1);

  if (!t) notFound();

  return (
    <div className="px-6 py-8 space-y-6">
      <Link
        href={`/${orgSlug}/${projectSlug}/traces`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Traces
      </Link>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{t.name}</h1>
          <Badge variant={STATUS_BADGE_VARIANT[t.status]}>{t.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>Duration: {formatDuration(t.latencyMs)}</span>
          <span>Tokens: {formatTokens(t.totalTokensInput, t.totalTokensOutput)}</span>
          <span>Cost: {formatCost(t.totalCostUsd)}</span>
          <span title={t.startedAt.toISOString()}>
            Started: {t.startedAt.toLocaleString()} ({formatRelativeTime(t.startedAt)})
          </span>
        </div>
        {t.tags && t.tags.length > 0 && (
          <div className="flex gap-1">
            {t.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Span tree coming soon.
      </div>
    </div>
  );
}
