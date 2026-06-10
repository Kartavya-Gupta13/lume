import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createDbEdge } from "@workspace/db";
import type { Bindings, Variables } from "../types";
import { batchSchema } from "../schemas";
import { insertBatch, NotFoundError } from "../lib/ingest";
import { validationHook } from "./validation";

export const batchRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

batchRoute.post("/", zValidator("json", batchSchema, validationHook), async (c) => {
  const projectId = c.get("projectId");
  const input = c.req.valid("json");
  const db = createDbEdge(c.env.DATABASE_URL);

  try {
    await insertBatch(db, projectId, input);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: { code: "not_found", message: err.message } }, 404);
    }
    throw err;
  }

  return c.json({ status: "ok" });
});
