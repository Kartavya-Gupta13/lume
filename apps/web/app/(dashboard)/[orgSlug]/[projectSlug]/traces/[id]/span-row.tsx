"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Bot, Wrench, Sparkles, Search, Box } from "lucide-react";
import type { trace } from "@workspace/db";
import { Badge, cn } from "@workspace/ui";
import { STATUS_BADGE_VARIANT, formatDuration, gantt } from "../format";
import type { SpanNode } from "./trace-detail-view";

const TYPE_ICON: Record<string, typeof Bot> = {
  llm_call: Bot,
  tool_call: Wrench,
  agent: Sparkles,
  retrieval: Search,
  custom: Box,
};

export function SpanRow({
  node,
  depth,
  trace: t,
  selectedSpanId,
  onSelect,
}: {
  node: SpanNode;
  depth: number;
  trace: typeof trace.$inferSelect;
  selectedSpanId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const Icon = TYPE_ICON[node.type] ?? Box;
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedSpanId;
  const { leftPct, widthPct } = gantt(t.startedAt, t.latencyMs, node.startedAt, node.latencyMs);

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(node.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(node.id);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent cursor-pointer",
          isSelected && "bg-accent",
        )}
        style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground",
            !hasChildren && "invisible",
          )}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

        <span className="truncate font-medium">{node.name}</span>

        <Badge variant={STATUS_BADGE_VARIANT[node.status]} className="shrink-0">
          {node.status}
        </Badge>

        <span className="shrink-0 text-xs text-muted-foreground">{formatDuration(node.latencyMs)}</span>

        <span className="relative h-1.5 flex-1 min-w-[80px] rounded-full bg-muted">
          <span
            className="absolute h-1.5 rounded-full bg-primary"
            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          />
        </span>
      </div>

      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <SpanRow
              key={child.id}
              node={child}
              depth={depth + 1}
              trace={t}
              selectedSpanId={selectedSpanId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
