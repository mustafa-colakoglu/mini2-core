import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";

/**
 * Context interface for request tracking
 */
export interface RequestContext {
  traceId: string;
  [key: string]: any; //* Allow additional context properties
}

/**
 * AsyncLocalStorage instance for request context
 */
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 * @returns The current request context or undefined if not in a request context
 */
export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get the traceId from the current request context
 * @returns The traceId or undefined if not in a request context
 */
export function getTraceId(): string | undefined {
  return asyncLocalStorage.getStore()?.traceId;
}

/**
 * Run a function within a request context
 * Works for both synchronous and asynchronous functions.
 * AsyncLocalStorage automatically maintains context through async continuations.
 * @param context The context to set
 * @param fn The function to run within the context (can be sync or async)
 * @returns The result of the function (or a Promise if the function is async)
 */
export function runInContext<T>(
  context: RequestContext,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return asyncLocalStorage.run(context, fn);
}

/**
 * Set additional data in the current context
 * @param key The key to set
 * @param value The value to set
 * @throws Error if not in a request context
 */
export function setContextValue(key: string, value: any): void {
  const context = asyncLocalStorage.getStore();
  if (!context) {
    throw new Error("Cannot set context value: not in a request context");
  }
  context[key] = value;
}

/**
 * Get a value from the current context
 * @param key The key to get
 * @returns The value or undefined if not found or not in a request context
 */
export function getContextValue<T = any>(key: string): T | undefined {
  const context = asyncLocalStorage.getStore();
  return context?.[key] as T | undefined;
}

/**
 * Generate a unique trace ID using UUID v4
 * @returns A unique trace ID string (UUID v4 format)
 */
export function generateTraceId(): string {
  return randomUUID();
}

export { asyncLocalStorage };
