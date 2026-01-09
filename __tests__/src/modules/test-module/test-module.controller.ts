// __tests__/app.test.ts
import 'reflect-metadata';
import { Request, Response, NextFunction, RequestHandler } from 'express';

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
	ResponseBuilder,
} from '../../../../index';

import {
	IsString,
	IsOptional,
	IsInt,
	Min,
	Max,
	IsNotEmpty,
	IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

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
	'x-echo': string;
	@IsMongoId()
	'x-mongo-id': string;
}

/* ----------------------------- Örnek extra middleware ----------------------------- */
const echoHeader: RequestHandler = (req, _res, next) => {
	(req as any).echo = req.headers['x-echo'] ?? null;
	next();
};

/* ------------------------------- Controller ------------------------------ */
@controller('/test', 'Test Controller', 'Test Module')
// @ts-ignore
class TestController extends Controller implements IController {
	constructor() {
		super();
	}

	@get('/', 'Root GET')
	public root(@req() req: Request, @res() res: Response): void {
		res.setHeader('x-handler', 'root');
		res.json({
			ok: true,
			route: 'GET /test',
			echo: (req as any).echo ?? null,
			moduleName: this.moduleName,
			basePath: this.routeDefinitions.basePath,
			routesCount: this.routeDefinitions.routes.length,
		});
	}

	@get('/query', 'Query test')
	@validate({ query: QueryDto })
	public queryTest(@query() queryObj: QueryDto, @res() res: Response): void {
		res.setHeader('x-handler', 'query');
		res.json({ ok: true, route: 'GET /test/query', query: queryObj });
	}

	@post('/create', 'Create')
	@validate({ body: CreateDto })
	@middleware(echoHeader)
	public create(@body() bodyObj: CreateDto, @res() res: Response): void {
		res.setHeader('x-handler', 'create');
		res.status(201).json({
			ok: true,
			route: 'POST /test/create',
			body: bodyObj,
			echo: (res.req as any).echo ?? null,
		});
	}

	@put('/:id', 'Update')
	@validate([{ params: IdParams }, { body: UpdateDto }])
	public update(
		@params() paramsObj: IdParams,
		@body() bodyObj: UpdateDto,
		@res() res: Response
	): void {
		res.setHeader('x-handler', 'update');
		res.json({
			ok: true,
			route: `PUT /test/${paramsObj?.id}`,
			params: paramsObj,
			body: bodyObj,
		});
	}

	@patch('/:id', 'Patch')
	@validate([{ params: IdParams }, { body: UpdateDto }])
	public patchOne(
		@params() paramsObj: IdParams,
		@body() bodyObj: UpdateDto,
		@res() res: Response
	): void {
		res.setHeader('x-handler', 'patch');
		res.json({
			ok: true,
			route: `PATCH /test/${paramsObj?.id}`,
			params: paramsObj,
			body: bodyObj,
		});
	}

	@del('/:id', 'Delete')
	@validate({ params: IdParams })
	@authorized(['admin'])
	public remove(@params() paramsObj: IdParams, @res() res: Response): void {
		res.setHeader('x-handler', 'delete');
		res.json({
			ok: true,
			route: `DELETE /test/${paramsObj?.id}`,
			params: paramsObj,
		});
	}

	@get('/secured', 'Secured GET')
	@authenticated()
	public secured(@req() req: Request, @res() res: Response): void {
		res.setHeader('x-handler', 'secured');
		res.json({
			ok: true,
			route: 'GET /test/secured',
			user: (req as any).user ?? null,
		});
	}

	@get('/custom', 'Custom meta/mw test')
	@custom('tags', ['demo', 'test'])
	@middleware((req, _res, next) => {
		(req as any).customInjected = true;
		next();
	})
	public customMeta(@req() req: Request, @res() res: Response): void {
		res.setHeader('x-handler', 'custom');
		res.json({
			ok: true,
			route: 'GET /test/custom',
			customInjected: (req as any).customInjected === true,
		});
	}

	@get('/next-error', 'Next error')
	public nextError(
		@req() _req: Request,
		@res() _res: Response,
		@next() next: NextFunction
	): void {
		next(new Error('Manual error from /test/next-error'));
	}

	@get('/registry', 'Registry dump')
	public registryDump(@res() res: Response): void {
		const defs = this.routeDefinitions;
		res.setHeader('x-handler', 'registry');
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
	@get('/validate-header', 'Validate header')
	@validate({ headers: TestHeaderValidationDto })
	public validateHeader(@req() req: Request): ResponseBuilder<any> {
		const headers = req.headers as any;
		const echoHeader = headers['x-echo'] ?? null;
		const mongoId = headers['x-mongo-id'] ?? null;
		console.log('Header validation:', { echoHeader, mongoId });
		return new ResponseBuilder().ok({
			route: 'GET /test/validate-header',
			echo: echoHeader ?? null,
		});
	}
}
