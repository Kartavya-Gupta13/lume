import { AsyncLocalStorage } from "node:async_hooks";
import type { Tracer } from "./tracer";

const als = new AsyncLocalStorage<Tracer>();

export function runWithTracer<T>(tracer: Tracer, fn: () => T): T {
  return als.run(tracer, fn);
}

export function getCurrentTracer(): Tracer | undefined {
  return als.getStore();
}
