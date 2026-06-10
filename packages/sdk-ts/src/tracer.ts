import type { BatchQueue } from "./batch-queue";
import type { EventAttributes, SpanAttributes, SpanWithTraceId } from "./types";

function serializeError(err: unknown): unknown {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

export class Tracer {
  constructor(
    private readonly queue: BatchQueue,
    private readonly traceId: string,
    private readonly parentSpanId: string | undefined,
  ) {}

  async span<T>(
    name: string,
    attrs: SpanAttributes,
    fn: (tracer: Tracer) => T | Promise<T>,
  ): Promise<T> {
    const id = crypto.randomUUID();
    const startedAt = new Date();
    const childTracer = new Tracer(this.queue, this.traceId, id);

    try {
      const result = await fn(childTracer);
      const endedAt = new Date();
      const span: SpanWithTraceId = {
        id,
        traceId: this.traceId,
        parentSpanId: this.parentSpanId,
        name,
        type: attrs.type,
        status: "ok",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: endedAt.getTime() - startedAt.getTime(),
        input: attrs.input,
        output: attrs.output ?? result,
        model: attrs.model,
        tokensInput: attrs.tokensInput,
        tokensOutput: attrs.tokensOutput,
        costUsd: attrs.costUsd,
        metadata: attrs.metadata,
      };
      this.queue.addSpan(span);
      return result;
    } catch (err) {
      const endedAt = new Date();
      const span: SpanWithTraceId = {
        id,
        traceId: this.traceId,
        parentSpanId: this.parentSpanId,
        name,
        type: attrs.type,
        status: "error",
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        latencyMs: endedAt.getTime() - startedAt.getTime(),
        input: attrs.input,
        error: serializeError(err),
        model: attrs.model,
        tokensInput: attrs.tokensInput,
        tokensOutput: attrs.tokensOutput,
        costUsd: attrs.costUsd,
        metadata: attrs.metadata,
      };
      this.queue.addSpan(span);
      throw err;
    }
  }

  event(message: string, attrs: EventAttributes = {}): void {
    if (!this.parentSpanId) {
      throw new Error(
        "tracer.event() must be called from inside tracer.span() - events are attached to spans",
      );
    }
    this.queue.addEvent({
      spanId: this.parentSpanId,
      timestamp: new Date().toISOString(),
      level: attrs.level ?? "info",
      message,
      attributes: attrs.attributes,
    });
  }
}
