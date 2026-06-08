import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors());

app.get("/v1/health", (c) => {
  return c.json({ status: "ok" });
});

export default app;
