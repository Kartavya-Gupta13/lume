import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings, Variables } from "./types";
import { apiKeyAuth } from "./middleware/auth";
import { payloadLimit } from "./middleware/payload-limit";
import { tracesRoute } from "./routes/traces";
import { spansRoute } from "./routes/spans";
import { eventsRoute } from "./routes/events";
import { batchRoute } from "./routes/batch";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", cors());

app.get("/v1/health", (c) => {
  return c.json({ status: "ok" });
});

const v1 = new Hono<{ Bindings: Bindings; Variables: Variables }>();
v1.use("*", payloadLimit());
v1.use("*", apiKeyAuth());
v1.route("/traces", tracesRoute);
v1.route("/spans", spansRoute);
v1.route("/events", eventsRoute);
v1.route("/batch", batchRoute);

app.route("/v1", v1);

export default app;
