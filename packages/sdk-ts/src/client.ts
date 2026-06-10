import { BatchQueue } from "./batch-queue";
import { runWithTracer } from "./context";
import { Tracer } from "./tracer";
import type { LumeOptions, TraceInput } from "./types";

const DEFAULT_BASE_URL = "http://localhost:8787";
const DEFAULT_FLUSH_INTERVAL_MS = 1000;
const DEFAULT_MAX_BATCH_SIZE = 100;

export class Lume {
  private readonly queue: BatchQueue;

  constructor(options: LumeOptions) {
    this.queue = new BatchQueue({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      flushIntervalMs: options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
      maxBatchSize: options.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE,
    });
  }

  async trace<T>(
    name: string,
    fn: (tracer: Tracer) => T | Promise<T>,
    attrs: { userIdExternal?: string; tags?: string[]; metadata?: Record<string, unknown> } = {},
  ): Promise<T> {
    const id = crypto.randomUUID();
    const startedAt = new Date();
    const tracer = new Tracer(this.queue, id, undefined);

    try {
      const result = await runWithTracer(tracer, () => fn(tracer));
      const endedAt = new Date();
      const trace: TraceInput = {
        id,
        name,
        status: "ok",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: endedAt.getTime() - startedAt.getTime(),
        userIdExternal: attrs.userIdExternal,
        tags: attrs.tags,
        metadata: attrs.metadata,
      };
      this.queue.addTrace(trace);
      return result;
    } catch (err) {
      const endedAt = new Date();
      const trace: TraceInput = {
        id,
        name,
        status: "error",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: endedAt.getTime() - startedAt.getTime(),
        userIdExternal: attrs.userIdExternal,
        tags: attrs.tags,
        metadata: attrs.metadata,
      };
      this.queue.addTrace(trace);
      throw err;
    }
  }

  async flush(): Promise<void> {
    await this.queue.flush();
  }

  shutdown(): void {
    this.queue.shutdown();
  }
}
