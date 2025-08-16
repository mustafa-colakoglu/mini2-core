import { IsString, IsOptional, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

/* ----------------------------- Class-Validator DTOs ----------------------------- */

// /test/create -> body
export class CreateDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

// /test/:id (params)
export class IdParams {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

// /test/:id (PUT/PATCH) -> body
export class UpdateDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}

// /test/query -> query
export class QueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  q?: string;
}

/* ----------------------------- Örnek extra middleware ----------------------------- */
const echoHeader: RequestHandler = (req, _res, next) => {
  (req as any).echo = req.headers['x-echo'] ?? null;
  next();
};

/* ------------------------------- Controller ------------------------------ */
// NOT: Buradan aşağıdaki dekoratörler/sınıflar senin framework’ünden geliyor:
// @controller, @get, @post, @put, @patch, @del, @validate, @authenticated, @authorized,
// @middleware, @custom, @req, @res, @next, @body, @query, @params, Controller, IController,
// IResponseBuilder, buildApp vs.

@controller('/test', 'Test Controller', 'Test Module')
export class Test extends Controller implements IController {
  constructor() {
    super('Test Module'); // opsiyonel
  }

  /* GET /test */
  @get('/', 'Root GET')
  public root(
    @req() req: Request,
    @res() res: Response
  ) {
    return {
      build: (r: Response) => r.json({
        ok: true,
        route: 'GET /test',
        echo: (req as any).echo ?? null,
        moduleName: this.moduleName,
        basePath: this.RouteManager.basePath,
        routesCount: this.RouteManager.routes.length,
      })
    };
  }

  /* GET /test/query?x=... */
  @get('/query', 'Query test')
  @validate({ query: QueryDto })
  public queryTest(
    @query() query: QueryDto,
    @res() res: Response
  ) {
    return {
      build: (r: Response) => r.json({
        ok: true,
        route: 'GET /test/query',
        query,
      })
    };
  }

  /* POST /test/create */
  @post('/create', 'Create')
  @validate({ body: CreateDto })
  @middleware(echoHeader)
  public create(
    @body() body: CreateDto,
    @res() res: Response
  ) {
    return {
      build: (r: Response) => r.status(201).json({
        ok: true,
        route: 'POST /test/create',
        body,
        echo: (r.req as any).echo ?? null,
      })
    };
  }

  /* PUT /test/:id */
  @put('/:id', 'Update')
  @validate([{ params: IdParams }, { body: UpdateDto }])
  public update(
    @params() params: IdParams,
    @body() body: UpdateDto,
    @res() res: Response
  ) {
    return {
      build: (r: Response) => r.json({
        ok: true,
        route: `PUT /test/${params?.id}`,
        params,
        body,
      })
    };
  }

  /* PATCH /test/:id */
  @patch('/:id', 'Patch')
  @validate([{ params: IdParams }, { body: UpdateDto }])
  public patchOne(
    @params() params: IdParams,
    @body() body: UpdateDto,
    @res() res: Response
  ) {
    return {
      build: (r: Response) => r.json({
        ok: true,
        route: `PATCH /test/${params?.id}`,
        params,
        body,
      })
    };
  }

  /* DELETE /test/:id  (izin gerekir) */
  @del('/:id', 'Delete')
  @validate({ params: IdParams })
  @authorized(['admin']) // req.user.permissions içinde 'admin' yoksa 403
  public remove(
    @params() params: IdParams,
    @res() res: Response
  ) {
    return {
      build: (r: Response) => r.json({
        ok: true,
        route: `DELETE /test/${params?.id}`,
        params,
      })
    };
  }

  /* GET /test/secured  (login gerekir) */
  @get('/secured', 'Secured GET')
  @authenticated()
  public secured(
    @req() req: Request,
    @res() res: Response
  ) {
    return {
      build: (r: Response) => r.json({
        ok: true,
        route: 'GET /test/secured',
        user: (req as any).user ?? null,
      })
    };
  }

  /* GET /test/custom  (extraData ve custom middleware kullanımı) */
  @get('/custom', 'Custom meta/mw test')
  @custom('tags', ['demo', 'test'])
  @middleware((req, _res, next) => { (req as any).customInjected = true; next(); })
  public customMeta(
    @req() req: Request,
    @res() res: Response
  ) {
    return {
      build: (r: Response) => r.json({
        ok: true,
        route: 'GET /test/custom',
        customInjected: (req as any).customInjected === true,
      })
    };
  }

  /* GET /test/next-error  (next() ile bir hata fırlatma testi) */
  @get('/next-error', 'Next error')
  public nextError(
    @req() _req: Request,
    @res() _res: Response,
    @next() next: NextFunction
  ) {
    next(new Error('Manual error from /test/next-error'));
    // handler bir şey döndürmeyecek; error middleware’in devreye girmeli
    return {
      build: (_r: Response) => { /* no-op */ }
    } as IResponseBuilder;
  }

  /* GET /test/registry  (RouteRegistry introspection) */
  @get('/registry', 'Registry dump')
  public registryDump(@res() res: Response) {
    const defs = this.RouteManager;
    return {
      build: (r: Response) => r.json({
        basePath: defs.basePath,
        controllerName: defs.controllerName ?? null,
        moduleName: defs.moduleName ?? null,
        routes: defs.routes.map(rt => ({
          methodName: rt.methodName,
          method: rt.method ?? null,
          path: rt.path ?? null,
          name: rt.name ?? null,
          permissions: rt.permissions,
          authenticated: rt.authenticated ?? false,
        })),
      })
    };
  }
}