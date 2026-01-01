// __tests__/app.test.ts
import "reflect-metadata";
import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import request from "supertest";

// Framework tek dosyan (B) — yolu gerekirse değiştir
import {
  controller,
  get,
  post,
  put,
  del,
  patch,
  validate,
  authenticated,
  authorized,
  middleware,
  custom,
  req,
  res,
  next,
  body,
  query,
  params,
  Controller,
  IController,
  buildApp,
  ResponseBuilder,
  contextMiddleware,
} from "../index";

import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsMongoId,
} from "class-validator";
import { Type } from "class-transformer";

/* ----------------------------- Class-Validator DTOs ----------------------------- */
class CreateDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsOptional() description?: string;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() order?: number;
}
class IdParams {
  @IsString() @IsNotEmpty() id!: string;
}
class UpdateDto {
  @IsString() @IsNotEmpty() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @Type(() => Number) @IsInt() @Min(0) @IsOptional() order?: number;
}
class QueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page?: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limit?: number;
  @IsString() @IsOptional() q?: string;
}
class TestHeaderValidationDto {
  @IsString()
  "x-echo": string;
  @IsMongoId()
  "x-mongo-id": string;
}

/* ----------------------------- Örnek extra middleware ----------------------------- */
const echoHeader: RequestHandler = (req, _res, next) => {
  (req as any).echo = req.headers["x-echo"] ?? null;
  next();
};

/* ------------------------------- Controller ------------------------------ */
@controller("/test", "Test Controller", "Test Module")
class Test extends Controller implements IController {
  constructor() {
    super();
  }

  @get("/", "Root GET")
  public root(@req() req: Request, @res() res: Response): void {
    res.setHeader("x-handler", "root");
    res.json({
      ok: true,
      route: "GET /test",
      echo: (req as any).echo ?? null,
      moduleName: this.moduleName,
      basePath: this.routeDefinitions.basePath,
      routesCount: this.routeDefinitions.routes.length,
    });
  }

  @get("/query", "Query test")
  @validate({ query: QueryDto })
  public queryTest(@query() queryObj: QueryDto, @res() res: Response): void {
    res.setHeader("x-handler", "query");
    res.json({ ok: true, route: "GET /test/query", query: queryObj });
  }

  @post("/create", "Create")
  @validate({ body: CreateDto })
  @middleware(echoHeader)
  public create(@body() bodyObj: CreateDto, @res() res: Response): void {
    res.setHeader("x-handler", "create");
    res.status(201).json({
      ok: true,
      route: "POST /test/create",
      body: bodyObj,
      echo: (res.req as any).echo ?? null,
    });
  }

  @put("/:id", "Update")
  @validate([{ params: IdParams }, { body: UpdateDto }])
  public update(
    @params() paramsObj: IdParams,
    @body() bodyObj: UpdateDto,
    @res() res: Response
  ): void {
    res.setHeader("x-handler", "update");
    res.json({
      ok: true,
      route: `PUT /test/${paramsObj?.id}`,
      params: paramsObj,
      body: bodyObj,
    });
  }

  @patch("/:id", "Patch")
  @validate([{ params: IdParams }, { body: UpdateDto }])
  public patchOne(
    @params() paramsObj: IdParams,
    @body() bodyObj: UpdateDto,
    @res() res: Response
  ): void {
    res.setHeader("x-handler", "patch");
    res.json({
      ok: true,
      route: `PATCH /test/${paramsObj?.id}`,
      params: paramsObj,
      body: bodyObj,
    });
  }

  @del("/:id", "Delete")
  @validate({ params: IdParams })
  @authorized(["admin"])
  public remove(@params() paramsObj: IdParams, @res() res: Response): void {
    res.setHeader("x-handler", "delete");
    res.json({
      ok: true,
      route: `DELETE /test/${paramsObj?.id}`,
      params: paramsObj,
    });
  }

  @get("/secured", "Secured GET")
  @authenticated()
  public secured(@req() req: Request, @res() res: Response): void {
    res.setHeader("x-handler", "secured");
    res.json({
      ok: true,
      route: "GET /test/secured",
      user: (req as any).user ?? null,
    });
  }

  @get("/custom", "Custom meta/mw test")
  @custom("tags", ["demo", "test"])
  @middleware((req, _res, next) => {
    (req as any).customInjected = true;
    next();
  })
  public customMeta(@req() req: Request, @res() res: Response): void {
    res.setHeader("x-handler", "custom");
    res.json({
      ok: true,
      route: "GET /test/custom",
      customInjected: (req as any).customInjected === true,
    });
  }

  @get("/next-error", "Next error")
  public nextError(
    @req() _req: Request,
    @res() _res: Response,
    @next() next: NextFunction
  ): void {
    next(new Error("Manual error from /test/next-error"));
  }

  @get("/registry", "Registry dump")
  public registryDump(@res() res: Response): void {
    const defs = this.routeDefinitions;
    res.setHeader("x-handler", "registry");
    res.json({
      basePath: defs.basePath,
      controllerName: defs.controllerName ?? null,
      moduleName: defs.moduleName ?? null,
      routes: defs.routes.map((rt) => ({
        methodName: rt.methodName,
        method: rt.method ?? null,
        path: rt.path ?? null,
        name: rt.name ?? null,
        permissions: rt.permissions,
        authenticated: rt.authenticated ?? false,
      })),
    });
  }
  @get("/validate-header", "Validate header")
  @validate({ headers: TestHeaderValidationDto })
  public validateHeader(@req() req: Request): ResponseBuilder<any> {
    const headers = req.headers as any;
    const echoHeader = headers["x-echo"] ?? null;
    const mongoId = headers["x-mongo-id"] ?? null;
    console.log("Header validation:", { echoHeader, mongoId });
    return new ResponseBuilder().ok({
      route: "GET /test/validate-header",
      echo: echoHeader ?? null,
    });
  }
}
/* ----------------------------- Test app builder ----------------------------- */
function makeApp() {
  const app = express();
  // Apply context middleware first to wrap all requests with async local storage
  app.use(contextMiddleware);
  app.use(express.json());

  const controllers: IController[] = [new Test()];
  buildApp(app, controllers);

  // ⬇⬇⬇ HATA YAKALAYICI HER ZAMAN ROUTELARDAN SONRA!
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      // Senin verdiğin global handler ile aynı mantık:
      // HttpException türevleri için kendi code/messageJson; diğerlerinde generic 500
      // Burada require etmiyoruz; sadece shape üzerinden kontrol ediyoruz
      const maybe = error as any;
      if (
        maybe &&
        typeof maybe === "object" &&
        "code" in maybe &&
        "messageJson" in maybe
      ) {
        return res.status(maybe.code).json(maybe.messageJson);
      }
      // fallback generic
      console.error("Unexpected error:", error);
      return res.status(500).json({ errorId: 1, message: "Some error happen" });
    }
  );

  return app;
}

/* --------------------------------- Tests ---------------------------------- */
describe("Test controller (integration)", () => {
  it("GET /test -> 200", async () => {
    const app = makeApp();
    const res_ = await request(app).get("/test");
    expect(res_.status).toBe(200);
    expect(res_.headers["x-handler"]).toBe("root");
    expect(res_.body).toEqual(
      expect.objectContaining({
        ok: true,
        route: "GET /test",
        basePath: "/test",
      })
    );
  });

  it("GET /test/query -> 200 & returns query", async () => {
    const app = makeApp();
    const res_ = await request(app).get("/test/query?page=2&limit=10&q=hello");
    expect(res_.status).toBe(200);
    expect(res_.headers["x-handler"]).toBe("query");
    expect(res_.body.route).toBe("GET /test/query");
    expect(res_.body.query).toEqual(
      expect.objectContaining({ page: 2, limit: 10, q: "hello" })
    );
  });

  it("POST /test/create -> 201 & echoes header", async () => {
    const app = makeApp();
    const res_ = await request(app)
      .post("/test/create")
      .set("x-echo", "hi")
      .send({ title: "hello", description: "world", order: 1 });
    expect(res_.status).toBe(201);
    expect(res_.headers["x-handler"]).toBe("create");
    expect(res_.body.route).toBe("POST /test/create");
    expect(res_.body.body).toEqual(
      expect.objectContaining({ title: "hello", order: 1 })
    );
    expect(res_.body.echo).toBe("hi");
  });

  it("PUT /test/:id -> 200", async () => {
    const app = makeApp();
    const res_ = await request(app)
      .put("/test/abc123")
      .send({ title: "updated", description: "desc2", order: 9 });
    expect(res_.status).toBe(200);
    expect(res_.headers["x-handler"]).toBe("update");
    expect(res_.body.route).toBe("PUT /test/abc123");
    expect(res_.body.params).toEqual(expect.objectContaining({ id: "abc123" }));
  });

  it("PATCH /test/:id -> 200", async () => {
    const app = makeApp();
    const res_ = await request(app)
      .patch("/test/xyz")
      .send({ description: "patched" });
    expect(res_.status).toBe(200);
    expect(res_.headers["x-handler"]).toBe("patch");
    expect(res_.body.route).toBe("PATCH /test/xyz");
  });

  it("DELETE /test/:id without permission -> 403", async () => {
    const app = makeApp();
    const res_ = await request(app)
      .delete("/test/foo")
      .set("x-authenticated", "true"); // login var ama izin yok → ForbiddenException throw
    expect(res_.status).toBe(403);
  });

  it("DELETE /test/:id with admin permission -> 200", async () => {
    const app = makeApp();
    const res_ = await request(app)
      .delete("/test/foo")
      .set("x-authenticated", "true")
      .set("x-user-permissions", "admin"); // admin → geç
    expect(res_.status).toBe(200);
    expect(res_.headers["x-handler"]).toBe("delete");
    expect(res_.body.route).toBe("DELETE /test/foo");
  });

  it("GET /test/secured without user -> 401", async () => {
    const app = makeApp(); // header yok → UnauthorizedException throw
    const res_ = await request(app).get("/test/secured");
    expect(res_.status).toBe(401);
  });

  it("GET /test/secured with user -> 200", async () => {
    const app = makeApp();
    const res_ = await request(app)
      .get("/test/secured")
      .set("x-authenticated", "true")
      .set("x-user-id", "u2")
      .set("x-user-permissions", "reader");
    expect(res_.status).toBe(200);
    expect(res_.headers["x-handler"]).toBe("secured");
    expect(res_.body.user).toEqual(expect.objectContaining({ id: "u2" }));
  });

  it("GET /test/custom -> 200 (custom middleware)", async () => {
    const app = makeApp();
    const res_ = await request(app).get("/test/custom");
    expect(res_.status).toBe(200);
    expect(res_.headers["x-handler"]).toBe("custom");
    expect(res_.body.customInjected).toBe(true);
  });

  it("GET /test/next-error -> 500 (next(err) path)", async () => {
    const app = makeApp();
    const res_ = await request(app).get("/test/next-error");
    expect(res_.status).toBe(500);
    // Senin global handler generic gövde döndürüyor:
    expect(res_.body).toEqual({ errorId: 1, message: "Some error happen" });
  });

  it("GET /test/registry -> 200", async () => {
    const app = makeApp();
    const res_ = await request(app).get("/test/registry");
    expect(res_.status).toBe(200);
    expect(res_.headers["x-handler"]).toBe("registry");
    expect(res_.body.basePath).toBe("/test");
    expect(Array.isArray(res_.body.routes)).toBe(true);
    expect(res_.body.routes.length).toBeGreaterThan(0);
  });

  it("GET /test/validate-header -> 400", async () => {
    const app = makeApp();
    const res_ = await request(app).get("/test/validate-header");
    expect(res_.status).toBe(400);
  });
  it("GET /test/validate-header -> 400", async () => {
    const app = makeApp();
    const res_ = await request(app)
      .get("/test/validate-header")
      .set("x-echo", "my-header-value")
      .set("x-mongo-id", "507f1f77bcf86cd799439www");
    expect(res_.status).toBe(400);
  });
  it("GET /test/validate-header -> 200", async () => {
    const app = makeApp();
    const res_ = await request(app)
      .get("/test/validate-header")
      .set("x-echo", "my-header-value")
      .set("x-mongo-id", "507f1f77bcf86cd799439011");
    expect(res_.status).toBe(200);
  });

  it("should include X-Trace-Id header in all responses", async () => {
    const app = makeApp();
    const res_ = await request(app).get("/test");
    expect(res_.status).toBe(200);
    expect(res_.headers["x-trace-id"]).toBeDefined();
    expect(typeof res_.headers["x-trace-id"]).toBe("string");
  });

  it("should use provided x-trace-id header when present", async () => {
    const app = makeApp();
    const customTraceId = "custom-trace-id-123";
    const res_ = await request(app)
      .get("/test")
      .set("x-trace-id", customTraceId);
    expect(res_.status).toBe(200);
    expect(res_.headers["x-trace-id"]).toBe(customTraceId);
  });

  it("should generate unique traceId for each request", async () => {
    const app = makeApp();
    const [res1, res2, res3] = await Promise.all([
      request(app).get("/test"),
      request(app).get("/test"),
      request(app).get("/test"),
    ]);

    expect(res1.headers["x-trace-id"]).toBeDefined();
    expect(res2.headers["x-trace-id"]).toBeDefined();
    expect(res3.headers["x-trace-id"]).toBeDefined();

    //* Each request should have a unique traceId
    const traceIds = [
      res1.headers["x-trace-id"],
      res2.headers["x-trace-id"],
      res3.headers["x-trace-id"],
    ];
    const uniqueTraceIds = new Set(traceIds);
    expect(uniqueTraceIds.size).toBe(3);
  });
});
