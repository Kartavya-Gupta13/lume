import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { project, organization, trace, span, event } from "@workspace/db";
import { TraceDetailView, type SpanNode } from "./trace-detail-view";

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

  const spans = await db
    .select()
    .from(span)
    .where(eq(span.traceId, t.id))
    .orderBy(span.startedAt);

  const events =
    spans.length === 0
      ? []
      : await db
          .select()
          .from(event)
          .where(
            inArray(
              event.spanId,
              spans.map((s) => s.id),
            ),
          )
          .orderBy(event.timestamp);

  const eventsBySpanId = new Map<string, (typeof events)[number][]>();
  for (const e of events) {
    const list = eventsBySpanId.get(e.spanId) ?? [];
    list.push(e);
    eventsBySpanId.set(e.spanId, list);
  }

  const spanTree = buildSpanTree(spans);

  return (
    <TraceDetailView
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      trace={t}
      spanTree={spanTree}
      eventsBySpanId={Object.fromEntries(eventsBySpanId)}
    />
  );
}

function buildSpanTree(spans: (typeof span.$inferSelect)[]): SpanNode[] {
  const nodesById = new Map<string, SpanNode>();
  for (const s of spans) {
    nodesById.set(s.id, { ...s, children: [] });
  }

  const roots: SpanNode[] = [];
  for (const node of nodesById.values()) {
    if (node.parentSpanId && nodesById.has(node.parentSpanId)) {
      nodesById.get(node.parentSpanId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
