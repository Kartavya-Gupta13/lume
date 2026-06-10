import type { MiddlewareHandler } from "hono";

const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1MB

export function payloadLimit(): MiddlewareHandler {
  return async (c, next) => {
    const contentLength = c.req.header("content-length");
    if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
      return c.json(
        {
          error: {
            code: "payload_too_large",
            message: "Payload exceeds 1MB limit",
          },
        },
        413,
      );
    }
    await next();
  };
}
