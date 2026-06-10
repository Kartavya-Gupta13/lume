import type { Context } from "hono";
import type { ZodError } from "zod";

export function validationHook(
  result: { success: true; data: unknown } | { success: false; error: ZodError },
  c: Context,
) {
  if (!result.success) {
    return c.json(
      {
        error: {
          code: "invalid_request",
          message: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        },
      },
      400,
    );
  }
}
