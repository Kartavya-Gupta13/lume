import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createDbEdge } from "@workspace/db";
import type { Bindings, Variables } from "../types";
import { traceInputSchema } from "../schemas";
import { insertTrace } from "../lib/ingest";
import { validationHook } from "./validation";

export const tracesRoute = new Hono<{ Bindings: Bindings; Variables: Variables }>();

tracesRoute.post("/", zValidator("json", traceInputSchema, validationHook), async (c) => {
  const projectId = c.get("projectId");
  const input = c.req.valid("json");
  const db = createDbEdge(c.env.DATABASE_URL);

  await insertTrace(db, projectId, input);

  return c.json({ id: input.id, status: "ok" });
});
