import { NextFunction, Request, Response } from "express";
import {
  runInContext,
  generateTraceId,
  RequestContext,
} from "../utils/context";

/**
 * Middleware to wrap incoming requests with async local storage context
 */
export const contextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  //* Try to get traceId from headers (for distributed tracing)
  const traceIdFromHeader = req.headers["x-trace-id"] as string | undefined;

  //* Use header traceId if provided, otherwise generate a new one
  const traceId = traceIdFromHeader || generateTraceId();

  //* Create the context
  const context: RequestContext = {
    traceId,
  };

  //* Add traceId to response headers for client tracking
  res.setHeader("X-Trace-Id", traceId);

  runInContext(context, () => {
    next();
  });
};
