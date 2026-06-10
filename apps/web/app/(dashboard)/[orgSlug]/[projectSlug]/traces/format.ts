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
