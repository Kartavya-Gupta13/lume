import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ilike, lt, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { project, organization, trace, traceStatusEnum } from "@workspace/db";
import { Badge, type BadgeProps } from "@workspace/ui";
import { TracesFilterBar } from "./traces-filter-bar";
import { formatCost, formatDuration, formatRelativeTime, formatTokens } from "./format";

const PAGE_SIZE = 50;

const STATUS_BADGE_VARIANT: Record<(typeof traceStatusEnum.enumValues)[number], BadgeProps["variant"]> = {
  ok: "success",
  error: "destructive",
  in_progress: "pending",
};

function isTraceStatus(value: string): value is (typeof traceStatusEnum.enumValues)[number] {
  return (traceStatusEnum.enumValues as readonly string[]).includes(value);
}

function decodeCursor(cursor: string | undefined): { startedAt: Date; id: string } | null {
  if (!cursor) return null;
  const separatorIndex = cursor.lastIndexOf("_");
  if (separatorIndex === -1) return null;
  const startedAt = new Date(cursor.slice(0, separatorIndex));
  const id = cursor.slice(separatorIndex + 1);
  if (Number.isNaN(startedAt.getTime()) || !id) return null;
  return { startedAt, id };
}

function encodeCursor(startedAt: Date, id: string): string {
  return `${startedAt.toISOString()}_${id}`;
}

export default async function TracesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
  searchParams: Promise<{ status?: string; q?: string; cursor?: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const { status, q, cursor } = await searchParams;

  const [org] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, orgSlug))
    .limit(1);

  if (!org) notFound();

  const [proj] = await db
    .select({ id: project.id, name: project.name, slug: project.slug })
    .from(project)
    .where(and(eq(project.organizationId, org.id), eq(project.slug, projectSlug)))
    .limit(1);

  if (!proj) notFound();

  const conditions = [eq(trace.projectId, proj.id)];

  if (status && isTraceStatus(status)) {
    conditions.push(eq(trace.status, status));
  }

  if (q) {
    conditions.push(ilike(trace.name, `%${q}%`));
  }

  const decodedCursor = decodeCursor(cursor);
  if (decodedCursor) {
    conditions.push(
      or(
        lt(trace.startedAt, decodedCursor.startedAt),
        and(eq(trace.startedAt, decodedCursor.startedAt), lt(trace.id, decodedCursor.id)),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(trace)
    .where(and(...conditions))
    .orderBy(desc(trace.startedAt), desc(trace.id))
    .limit(PAGE_SIZE + 1);

  const hasNextPage = rows.length > PAGE_SIZE;
  const traces = rows.slice(0, PAGE_SIZE);
  const lastTrace = traces[traces.length - 1];

  const nextSearchParams = new URLSearchParams();
  if (status) nextSearchParams.set("status", status);
  if (q) nextSearchParams.set("q", q);
  if (lastTrace) nextSearchParams.set("cursor", encodeCursor(lastTrace.startedAt, lastTrace.id));

  return (
    <div className="px-6 py-8 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Traces</h1>
        <TracesFilterBar />
      </div>

      {traces.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center space-y-2 max-w-sm">
            <p className="text-sm font-medium">No traces yet</p>
            <p className="text-xs text-muted-foreground">
              Instrument your app with the Lume SDK and traces will appear here.
            </p>
            <Link
              href={`/${orgSlug}/${projectSlug}/settings`}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              Get your API key →
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-border">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span>Status</span>
            <span>Duration</span>
            <span>Tokens</span>
            <span>Cost</span>
            <span>Started</span>
            <span>Tags</span>
          </div>
          {traces.map((t) => (
            <Link
              key={t.id}
              href={`/${orgSlug}/${projectSlug}/traces/${t.id}`}
              className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] items-center gap-4 border-b border-border px-4 py-3 text-sm last:border-b-0 hover:bg-accent"
            >
              <span className="truncate font-medium">{t.name}</span>
              <Badge variant={STATUS_BADGE_VARIANT[t.status]}>{t.status}</Badge>
              <span className="text-muted-foreground tabular-nums">{formatDuration(t.latencyMs)}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatTokens(t.totalTokensInput, t.totalTokensOutput)}
              </span>
              <span className="text-muted-foreground tabular-nums">{formatCost(t.totalCostUsd)}</span>
              <span className="text-muted-foreground">{formatRelativeTime(t.startedAt)}</span>
              <span className="flex gap-1">
                {(t.tags ?? []).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </span>
            </Link>
          ))}
        </div>
      )}

      {hasNextPage && (
        <div className="flex justify-end">
          <Link
            href={`/${orgSlug}/${projectSlug}/traces?${nextSearchParams.toString()}`}
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Next →
          </Link>
        </div>
      )}
    </div>
  );
}
