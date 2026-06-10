import type { BadgeProps } from "@workspace/ui";

export const STATUS_BADGE_VARIANT: Record<string, BadgeProps["variant"]> = {
  ok: "success",
  error: "destructive",
  in_progress: "pending",
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const costFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "seconds" },
  { amount: 60, unit: "minutes" },
  { amount: 24, unit: "hours" },
  { amount: 7, unit: "days" },
  { amount: 4.34524, unit: "weeks" },
  { amount: 12, unit: "months" },
  { amount: Number.POSITIVE_INFINITY, unit: "years" },
];

export function formatRelativeTime(date: Date): string {
  let duration = (date.getTime() - Date.now()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return relativeTimeFormatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }

  return relativeTimeFormatter.format(Math.round(duration), "years");
}

export function formatDuration(latencyMs: number | null): string {
  if (latencyMs == null) return "—";
  if (latencyMs < 1000) return `${latencyMs}ms`;
  return `${(latencyMs / 1000).toFixed(2)}s`;
}

export function formatTokens(input: number | null, output: number | null): string {
  if (input == null && output == null) return "—";
  return `${(input ?? 0) + (output ?? 0)}`;
}

export function formatCost(costUsd: string | null): string {
  if (costUsd == null) return "—";
  return costFormatter.format(Number(costUsd));
}

/**
 * Returns left/width offsets (0-100) for a span's gantt bar, relative to the
 * trace's start time and total duration.
 */
export function gantt(
  traceStartedAt: Date,
  traceLatencyMs: number | null,
  spanStartedAt: Date,
  spanLatencyMs: number | null,
): { leftPct: number; widthPct: number } {
  if (!traceLatencyMs || traceLatencyMs <= 0) return { leftPct: 0, widthPct: 100 };

  const offsetMs = spanStartedAt.getTime() - traceStartedAt.getTime();
  const leftPct = clampPct((offsetMs / traceLatencyMs) * 100);
  const widthPct = Math.max(clampPct(((spanLatencyMs ?? 0) / traceLatencyMs) * 100), 0.5);

  return { leftPct, widthPct: Math.min(widthPct, 100 - leftPct) };
}

function clampPct(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}
