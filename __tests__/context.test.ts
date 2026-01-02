import "reflect-metadata";
import {
  getContext,
  getTraceId,
  runInContext,
  setContextValue,
  getContextValue,
  generateTraceId,
  RequestContext,
} from "../utils/context";
import { contextMiddleware } from "../middlewares/context.middleware";
import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

describe("Context Utilities", () => {
  describe("generateTraceId", () => {
    it("should generate a unique traceId", () => {
      const traceId1 = generateTraceId();
      const traceId2 = generateTraceId();

      expect(traceId1).toBeDefined();
      expect(traceId2).toBeDefined();
      expect(typeof traceId1).toBe("string");
      expect(traceId1).not.toBe(traceId2);
    });
  });

  describe("runInContext", () => {
    it("should set and retrieve context synchronously", () => {
      const context: RequestContext = { traceId: "test-trace-123" };

      runInContext(context, () => {
        const retrievedContext = getContext();
        expect(retrievedContext).toBeDefined();
        expect(retrievedContext?.traceId).toBe("test-trace-123");
      });
    });

    it("should not leak context outside of runInContext", () => {
      const context: RequestContext = { traceId: "test-trace-123" };

      runInContext(context, () => {
        //* Context should be available here
        expect(getContext()?.traceId).toBe("test-trace-123");
      });

      //* Context should not be available outside
      expect(getContext()).toBeUndefined();
    });

    it("should return the result of the function", () => {
      const context: RequestContext = { traceId: "test-trace-123" };

      const result = runInContext(context, () => {
        return "test-result";
      });

      expect(result).toBe("test-result");
    });

    it("should handle nested contexts", () => {
      const outerContext: RequestContext = { traceId: "outer-trace" };
      const innerContext: RequestContext = { traceId: "inner-trace" };

      runInContext(outerContext, () => {
        expect(getTraceId()).toBe("outer-trace");

        runInContext(innerContext, () => {
          expect(getTraceId()).toBe("inner-trace");
        });

        //* Should revert to outer context
        expect(getTraceId()).toBe("outer-trace");
      });
    });
  });

  describe("runInContext with async functions", () => {
    it("should set and retrieve context asynchronously", async () => {
      const context: RequestContext = { traceId: "async-trace-123" };

      await runInContext(context, async () => {
        const retrievedContext = getContext();
        expect(retrievedContext).toBeDefined();
        expect(retrievedContext?.traceId).toBe("async-trace-123");
      });
    });

    it("should maintain context through async operations", async () => {
      const context: RequestContext = { traceId: "async-trace-456" };

      await runInContext(context, async () => {
        //* Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 10));

        const traceId = getTraceId();
        expect(traceId).toBe("async-trace-456");
      });
    });

    it("should return the result of the async function", async () => {
      const context: RequestContext = { traceId: "async-trace-789" };

      const result = await runInContext(context, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async-result";
      });

      expect(result).toBe("async-result");
    });

    it("should propagate context through promise chains", async () => {
      const context: RequestContext = { traceId: "promise-trace" };

      await runInContext(context, async () => {
        const promise1 = Promise.resolve().then(() => {
          expect(getTraceId()).toBe("promise-trace");
        });

        const promise2 = promise1.then(() => {
          return Promise.resolve().then(() => {
            expect(getTraceId()).toBe("promise-trace");
          });
        });

        await promise2;
      });
    });
  });

  describe("getTraceId", () => {
    it("should return traceId when in context", () => {
      const context: RequestContext = { traceId: "trace-123" };

      runInContext(context, () => {
        expect(getTraceId()).toBe("trace-123");
      });
    });

    it("should return undefined when not in context", () => {
      expect(getTraceId()).toBeUndefined();
    });
  });

  describe("getContext", () => {
    it("should return full context when in context", () => {
      const context: RequestContext = {
        traceId: "trace-123",
        customKey: "customValue",
      };

      runInContext(context, () => {
        const retrieved = getContext();
        expect(retrieved).toEqual(context);
        expect(retrieved?.traceId).toBe("trace-123");
        expect(retrieved?.customKey).toBe("customValue");
      });
    });

    it("should return undefined when not in context", () => {
      expect(getContext()).toBeUndefined();
    });
  });

  describe("setContextValue", () => {
    it("should set a value in the current context", () => {
      const context: RequestContext = { traceId: "trace-123" };

      runInContext(context, () => {
        setContextValue("userId", "user-456");
        expect(getContextValue("userId")).toBe("user-456");
        expect(getContext()?.userId).toBe("user-456");
      });
    });

    it("should throw error when not in context", () => {
      expect(() => {
        setContextValue("key", "value");
      }).toThrow("Cannot set context value: not in a request context");
    });

    it("should update existing context values", () => {
      const context: RequestContext = { traceId: "trace-123" };

      runInContext(context, () => {
        setContextValue("count", 1);
        expect(getContextValue("count")).toBe(1);

        setContextValue("count", 2);
        expect(getContextValue("count")).toBe(2);
      });
    });
  });

  describe("getContextValue", () => {
    it("should get a value from the current context", () => {
      const context: RequestContext = {
        traceId: "trace-123",
        userId: "user-456",
      };

      runInContext(context, () => {
        expect(getContextValue("userId")).toBe("user-456");
        expect(getContextValue("traceId")).toBe("trace-123");
      });
    });

    it("should return undefined for non-existent keys", () => {
      const context: RequestContext = { traceId: "trace-123" };

      runInContext(context, () => {
        expect(getContextValue("nonExistent")).toBeUndefined();
      });
    });

    it("should return undefined when not in context", () => {
      expect(getContextValue("anyKey")).toBeUndefined();
    });

    it("should support typed values", () => {
      const context: RequestContext = {
        traceId: "trace-123",
        userId: "user-456",
        count: 42,
      };

      runInContext(context, () => {
        const userId = getContextValue<string>("userId");
        const count = getContextValue<number>("count");

        expect(typeof userId).toBe("string");
        expect(typeof count).toBe("number");
        expect(userId).toBe("user-456");
        expect(count).toBe(42);
      });
    });
  });
});

describe("Context Middleware", () => {
  describe("traceId generation", () => {
    it("should generate traceId when not provided in headers", async () => {
      const app = express();
      app.use(contextMiddleware);
      app.get("/test", (_req, res) => {
        res.json({ traceId: getTraceId() });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.body.traceId).toBeDefined();
      expect(typeof response.body.traceId).toBe("string");
      expect(response.headers["x-trace-id"]).toBeDefined();
      expect(response.headers["x-trace-id"]).toBe(response.body.traceId);
    });

    it("should use traceId from x-trace-id header", async () => {
      const app = express();
      app.use(contextMiddleware);
      app.get("/test", (_req, res) => {
        res.json({ traceId: getTraceId() });
      });

      const customTraceId = "custom-trace-id-123";
      const response = await request(app)
        .get("/test")
        .set("x-trace-id", customTraceId);

      expect(response.status).toBe(200);
      expect(response.body.traceId).toBe(customTraceId);
      expect(response.headers["x-trace-id"]).toBe(customTraceId);
    });
  });

  describe("context propagation", () => {
    it("should maintain context through async route handlers", async () => {
      const app = express();
      app.use(contextMiddleware);
      app.get("/test", async (_req, res) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        res.json({ traceId: getTraceId() });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.body.traceId).toBeDefined();
      expect(response.headers["x-trace-id"]).toBe(response.body.traceId);
    });

    it("should maintain context through multiple middlewares", async () => {
      const app = express();
      app.use(contextMiddleware);

      const customMiddleware = (
        _req: Request,
        _res: Response,
        next: NextFunction
      ) => {
        setContextValue("middlewareValue", "test-value");
        next();
      };

      app.use(customMiddleware);
      app.get("/test", (_req, res) => {
        res.json({
          traceId: getTraceId(),
          middlewareValue: getContextValue("middlewareValue"),
        });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.body.traceId).toBeDefined();
      expect(response.body.middlewareValue).toBe("test-value");
    });

    it("should maintain context in error handlers", async () => {
      const app = express();
      app.use(contextMiddleware);
      app.get("/test", (_req, _res, next) => {
        next(new Error("Test error"));
      });

      app.use(
        (error: Error, _req: Request, res: Response, _next: NextFunction) => {
          res.status(500).json({
            error: error.message,
            traceId: getTraceId(),
          });
        }
      );

      const response = await request(app).get("/test");

      expect(response.status).toBe(500);
      expect(response.body.traceId).toBeDefined();
      expect(response.headers["x-trace-id"]).toBe(response.body.traceId);
    });
  });

  describe("response headers", () => {
    it("should add X-Trace-Id to response headers", async () => {
      const app = express();
      app.use(contextMiddleware);
      app.get("/test", (_req, res) => {
        res.json({ ok: true });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.headers["x-trace-id"]).toBeDefined();
      expect(typeof response.headers["x-trace-id"]).toBe("string");
    });

    it("should use same traceId in response header and context", async () => {
      const app = express();
      app.use(contextMiddleware);
      app.get("/test", (_req, res) => {
        res.json({ traceId: getTraceId() });
      });

      const response = await request(app).get("/test");

      expect(response.status).toBe(200);
      expect(response.body.traceId).toBe(response.headers["x-trace-id"]);
    });
  });

  describe("multiple requests", () => {
    it("should maintain separate contexts for concurrent requests", async () => {
      const app = express();
      app.use(contextMiddleware);
      app.get("/test", (_req, res) => {
        res.json({ traceId: getTraceId() });
      });

      const [response1, response2, response3] = await Promise.all([
        request(app).get("/test"),
        request(app).get("/test"),
        request(app).get("/test"),
      ]);

      expect(response1.body.traceId).toBeDefined();
      expect(response2.body.traceId).toBeDefined();
      expect(response3.body.traceId).toBeDefined();

      //* Each request should have a unique traceId
      const traceIds = [
        response1.body.traceId,
        response2.body.traceId,
        response3.body.traceId,
      ];
      const uniqueTraceIds = new Set(traceIds);
      expect(uniqueTraceIds.size).toBe(3);
    });
  });
});
