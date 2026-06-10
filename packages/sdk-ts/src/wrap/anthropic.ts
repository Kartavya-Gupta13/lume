import type Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParams } from "@anthropic-ai/sdk/resources/messages";
import { getCurrentTracer } from "../context";
import type { SpanAttributes } from "../types";

/**
 * Wraps an Anthropic client so `messages.create` calls auto-emit an
 * `llm_call` span on the currently active tracer (set via `lume.trace()` /
 * `tracer.span()`). If no tracer is active, calls pass through untouched.
 *
 * Streaming responses (`stream: true`) are spanned for latency only —
 * output/token usage capture is not yet supported for streams.
 */
export function wrapAnthropic<T extends Anthropic>(client: T): T {
  const messages = client.messages;
  const original = messages.create.bind(messages);

  messages.create = (async (params: MessageCreateParams, options?: Anthropic.RequestOptions) => {
    const tracer = getCurrentTracer();
    if (!tracer) {
      return original(params, options);
    }

    const attrs: SpanAttributes = {
      type: "llm_call",
      input: params.messages,
      model: params.model,
    };

    return tracer.span("anthropic.messages.create", attrs, async () => {
      const result = await original(params, options);

      if (!params.stream) {
        const message = result as Message;
        if (message.usage) {
          attrs.tokensInput = message.usage.input_tokens;
          attrs.tokensOutput = message.usage.output_tokens;
        }
        attrs.output = message.content;
      }

      return result;
    });
  }) as typeof original;

  return client;
}
