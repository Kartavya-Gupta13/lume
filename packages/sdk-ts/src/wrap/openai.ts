import type OpenAI from "openai";
import type { ChatCompletion, ChatCompletionCreateParams } from "openai/resources/chat/completions";
import { getCurrentTracer } from "../context";
import type { SpanAttributes } from "../types";

/**
 * Wraps an OpenAI client so `chat.completions.create` calls auto-emit an
 * `llm_call` span on the currently active tracer (set via `lume.trace()` /
 * `tracer.span()`). If no tracer is active, calls pass through untouched.
 *
 * Streaming responses (`stream: true`) are spanned for latency only —
 * output/token usage capture is not yet supported for streams.
 */
export function wrapOpenAI<T extends OpenAI>(client: T): T {
  const completions = client.chat.completions;
  const original = completions.create.bind(completions);

  completions.create = (async (
    params: ChatCompletionCreateParams,
    options?: OpenAI.RequestOptions,
  ) => {
    const tracer = getCurrentTracer();
    if (!tracer) {
      return original(params, options);
    }

    const attrs: SpanAttributes = {
      type: "llm_call",
      input: params.messages,
      model: params.model,
    };

    return tracer.span("openai.chat.completions.create", attrs, async () => {
      const result = await original(params, options);

      if (!params.stream) {
        const completion = result as ChatCompletion;
        if (completion.usage) {
          attrs.tokensInput = completion.usage.prompt_tokens;
          attrs.tokensOutput = completion.usage.completion_tokens;
        }
        attrs.output = completion.choices?.[0]?.message;
      }

      return result;
    });
  }) as typeof original;

  return client;
}
