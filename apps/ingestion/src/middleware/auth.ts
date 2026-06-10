import { createHash } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { createDbEdge, apiKey } from "@workspace/db";
import type { Bindings, Variables } from "../types";

export function apiKeyAuth(): MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> {
  return async (c, next) => {
    const authHeader = c.req.header("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json(
        { error: { code: "unauthorized", message: "Missing API key" } },
        401,
      );
    }

    const rawKey = authHeader.slice("Bearer ".length);
    const keyHash = createHash("sha256").update(rawKey).digest("hex");

    const db = createDbEdge(c.env.DATABASE_URL);
    const [row] = await db
      .select({
        id: apiKey.id,
        projectId: apiKey.projectId,
        revokedAt: apiKey.revokedAt,
      })
      .from(apiKey)
      .where(eq(apiKey.keyHash, keyHash))
      .limit(1);

    if (!row || row.revokedAt) {
      return c.json(
        {
          error: {
            code: "unauthorized",
            message: "Invalid or revoked API key",
          },
        },
        401,
      );
    }

    c.executionCtx.waitUntil(
      db.update(apiKey).set({ lastUsedAt: new Date() }).where(eq(apiKey.id, row.id)),
    );

    c.set("projectId", row.projectId);
    await next();
  };
}
