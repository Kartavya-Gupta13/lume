"use client";

import { useState } from "react";
import Link from "next/link";
import type { trace, span, event } from "@workspace/db";
import { Badge, Button } from "@workspace/ui";
import {
  STATUS_BADGE_VARIANT,
  formatCost,
  formatDuration,
  formatRelativeTime,
  formatTokens,
} from "../format";
import { SpanRow } from "./span-row";
import { SpanDetailPanel } from "./span-detail-panel";

export type SpanNode = typeof span.$inferSelect & { children: SpanNode[] };
export type EventRow = typeof event.$inferSelect;

export function TraceDetailView({
  orgSlug,
  projectSlug,
  trace: t,
  spanTree,
  eventsBySpanId,
}: {
  orgSlug: string;
  projectSlug: string;
  trace: typeof trace.$inferSelect;
  spanTree: SpanNode[];
  eventsBySpanId: Record<string, EventRow[]>;
}) {
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const selectedSpan = selectedSpanId ? findSpan(spanTree, selectedSpanId) : null;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 space-y-2">
        <Link
          href={`/${orgSlug}/${projectSlug}/traces`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Traces
        </Link>

        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{t.name}</h1>
              <Badge variant={STATUS_BADGE_VARIANT[t.status]}>{t.status}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>Duration: {formatDuration(t.latencyMs)}</span>
              <span>Tokens: {formatTokens(t.totalTokensInput, t.totalTokensOutput)}</span>
              <span>Cost: {formatCost(t.totalCostUsd)}</span>
              <span title={t.startedAt.toISOString()}>
                Started: {t.startedAt.toLocaleString("en-US")} ({formatRelativeTime(t.startedAt)})
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

          <Button variant="outline" disabled title="Replay coming in a later phase">
            Replay
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        <div className="flex-1 min-w-0 overflow-auto px-6 py-4">
          {spanTree.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No spans recorded for this trace yet.
            </div>
          ) : (
            <div className="space-y-0.5">
              {spanTree.map((node) => (
                <SpanRow
                  key={node.id}
                  node={node}
                  depth={0}
                  trace={t}
                  selectedSpanId={selectedSpanId}
                  onSelect={setSelectedSpanId}
                />
              ))}
            </div>
          )}
        </div>

        <div className="lg:w-[420px] lg:shrink-0 border-t lg:border-t-0 lg:border-l border-border overflow-auto">
          <SpanDetailPanel span={selectedSpan} events={selectedSpan ? (eventsBySpanId[selectedSpan.id] ?? []) : []} />
        </div>
      </div>
    </div>
  );
}

function findSpan(nodes: SpanNode[], id: string): SpanNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findSpan(node.children, id);
    if (found) return found;
  }
  return null;
}
