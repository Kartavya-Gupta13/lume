import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createDbEdge } from "@workspace/db";
import type { Bindings, Variables } from "../types";
import { eventWithSpanIdSchema } from "../schemas";
import { insertEventForExistingSpan, NotFoundError } from "../lib/ingest";
import { validationHook } from "./validation";

export const eventsRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

eventsRoute.post("/", zValidator("json", eventWithSpanIdSchema, validationHook), async (c) => {
  const projectId = c.get("projectId");
  const input = c.req.valid("json");
  const db = createDbEdge(c.env.DATABASE_URL);

  let id: string;
  try {
    id = await insertEventForExistingSpan(db, projectId, input);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: { code: "not_found", message: err.message } }, 404);
    }
    throw err;
  }

  return c.json({ id, status: "ok" });
});
