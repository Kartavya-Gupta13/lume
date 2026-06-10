import type { BatchInput, EventWithSpanId, SpanWithTraceId, TraceInput } from "./types";

interface BatchQueueOptions {
  apiKey: string;
  baseUrl: string;
  flushIntervalMs: number;
  maxBatchSize: number;
}

export class BatchQueue {
  private traces: TraceInput[] = [];
  private spans: SpanWithTraceId[] = [];
  private events: EventWithSpanId[] = [];
  private timer: ReturnType<typeof setInterval> | undefined;
  private loggedError = false;

  constructor(private readonly options: BatchQueueOptions) {
    this.timer = setInterval(() => {
      void this.flush();
    }, options.flushIntervalMs);
    this.timer.unref?.();
  }

  addTrace(trace: TraceInput): void {
    this.traces.push(trace);
    this.flushIfFull();
  }

  addSpan(span: SpanWithTraceId): void {
    this.spans.push(span);
    this.flushIfFull();
  }

  addEvent(event: EventWithSpanId): void {
    this.events.push(event);
    this.flushIfFull();
  }

  private get size(): number {
    return this.traces.length + this.spans.length + this.events.length;
  }

  private flushIfFull(): void {
    if (this.size >= this.options.maxBatchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.size === 0) return;

    const batch: BatchInput = {
      traces: this.traces.length > 0 ? this.traces : undefined,
      spans: this.spans.length > 0 ? this.spans : undefined,
      events: this.events.length > 0 ? this.events : undefined,
    };
    this.traces = [];
    this.spans = [];
    this.events = [];

    try {
      const res = await fetch(`${this.options.baseUrl}/v1/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(batch),
      });
      if (!res.ok && !this.loggedError) {
        console.error(`[lume] failed to flush batch: ${res.status} ${res.statusText}`);
        this.loggedError = true;
      }
    } catch (err) {
      if (!this.loggedError) {
        console.error("[lume] failed to flush batch:", err);
        this.loggedError = true;
      }
    }
  }

  shutdown(): void {
    clearInterval(this.timer);
  }
}
