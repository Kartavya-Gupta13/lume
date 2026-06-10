"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Badge, Button } from "@workspace/ui";
import { STATUS_BADGE_VARIANT, formatCost, formatDuration, formatTokens } from "../format";
import type { EventRow, SpanNode } from "./trace-detail-view";

const EVENT_LEVEL_VARIANT: Record<string, "secondary" | "destructive" | "pending"> = {
  debug: "secondary",
  info: "secondary",
  warn: "pending",
  error: "destructive",
};

export function SpanDetailPanel({ span, events }: { span: SpanNode | null; events: EventRow[] }) {
  if (!span) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Select a span to inspect its details.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{span.name}</h2>
          <Badge variant={STATUS_BADGE_VARIANT[span.status]}>{span.status}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Type: {span.type}</span>
          {span.model && <span>Model: {span.model}</span>}
          <span>Duration: {formatDuration(span.latencyMs)}</span>
          <span>Tokens: {formatTokens(span.tokensInput, span.tokensOutput)}</span>
          <span>Cost: {formatCost(span.costUsd)}</span>
        </div>
      </div>

      <JsonBlock title="Input" value={span.input} />
      <JsonBlock title="Output" value={span.output} />
      {span.error != null && <JsonBlock title="Error" value={span.error} />}
      <JsonBlock title="Metadata" value={span.metadata} />

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Events</h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events recorded.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-md border border-border p-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={EVENT_LEVEL_VARIANT[e.level] ?? "secondary"}>{e.level}</Badge>
                  <span className="text-muted-foreground">{e.timestamp.toLocaleString("en-US")}</span>
                </div>
                <p>{e.message}</p>
                {e.attributes != null && <JsonBlock title="Attributes" value={e.attributes} compact />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function JsonBlock({ title, value, compact }: { title: string; value: unknown; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  if (value == null) return null;

  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <h3 className={compact ? "text-xs font-medium text-muted-foreground" : "text-sm font-medium"}>
          {title}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap break-words max-h-64">
        {text}
      </pre>
    </div>
  );
}
