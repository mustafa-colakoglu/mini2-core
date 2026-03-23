import 'reflect-metadata';
import { Request, Response, NextFunction, RequestHandler } from 'express';

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
	UnauthorizedException,
	preRequestScript,
	testScript,
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
@controller('/test2', 'Test2 Controller', 'Test2 Module')
// @ts-ignore
export class TestController2 extends Controller implements IController {
	constructor() {
		super();
	}

	@get('/', 'Root GET')
	public root(@req() req: Request, @res() res: Response): void {
		res.setHeader('x-handler', 'root');
		res.json({
			ok: true,
			route: 'GET /test2',
			echo: (req as any).echo ?? null,
			moduleName: this.moduleName,
			basePath: this.routeDefinitions.basePath,
			routesCount: this.routeDefinitions.routes.length,
		});
	}

	@get('/query', 'Query2 test')
	@validate({ query: QueryDto })
	public queryTest(@query() queryObj: QueryDto, @res() res: Response): void {
		res.setHeader('x-handler', 'query');
		res.json({ ok: true, route: 'GET /test2/query', query: queryObj });
	}

	@post('/create', 'Create2', {
		examples: [
			{
				request: {
					body: {
						title: 'Module 2 Item',
						description: 'Test from Module 2',
						order: 2,
					},
				},
				response: {
					201: {
						description: 'Item created successfully in module 2',
						data: {
							ok: true,
							route: 'POST /test2/create',
							body: {
								title: 'Module 2 Item',
								description: 'Test from Module 2',
								order: 2,
							},
							echo: null,
						},
					},
				},
			},
			{
				request: {
					body: {
						title: '',
						description: 'Test from Module 2',
						order: 2,
					},
				},
				response: {
					400: {
						description: 'Validation error',
						data: {
							error: 'Validation failed',
							validationErrors: [
								{ field: 'title', errors: ['title should not be empty'] },
							],
						},
					},
				},
			},
		],
	})
	@preRequestScript(`
// Module 2 specific setup
pm.environment.set("module", "test-module-2");
pm.environment.set("requestTimestamp", new Date().toISOString());

console.log("Pre-request: Creating item in Module 2");
	`)
	@testScript(`
// Module 2 specific tests
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response is from Module 2", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.route).to.include('test2');
});

console.log("Post-request: Module 2 item created");
	`)
	@validate({ body: CreateDto })
	@middleware(echoHeader)
	public create(@body() bodyObj: CreateDto, @res() res: Response): void {
		res.setHeader('x-handler', 'create');
		res.status(201).json({
			ok: true,
			route: 'POST /test2/create',
			body: bodyObj,
			echo: (res.req as any).echo ?? null,
		});
	}

	@put('/:id', 'Update2', {
		examples: [
			{
				request: {
					body: {
						title: 'Updated in Module 2',
						description: 'Module 2 Update',
						order: 10,
					},
					params: {
						id: '456',
					},
					query: {
						page: 2,
						limit: 20,
						q: 'module2',
					},
					headers: {
						'x-echo': 'module2-header',
						'x-mongo-id': '507f1f77bcf86cd799439011',
					},
				},
				response: {
					200: {
						description: 'Item updated successfully in module 2',
						data: {
							ok: true,
							route: 'PUT /test2/456',
							params: { id: '456' },
							body: {
								title: 'Updated in Module 2',
								description: 'Module 2 Update',
								order: 10,
							},
							query: { page: 2, limit: 20, q: 'module2' },
						},
					},
				},
			},
			{
				request: {
					body: {
						title: '',
						description: 'Module 2 Update',
						order: 10,
					},
					params: {
						id: '456',
					},
					query: {
						page: 2,
						limit: 20,
						q: 'module2',
					},
					headers: {
						'x-echo': 'module2-header',
						'x-mongo-id': '507f1f77bcf86cd799439011',
					},
				},
				response: {
					400: {
						description: 'Validation error',
						data: {
							error: 'Validation failed',
							validationErrors: [
								{ field: 'title', errors: ['title should not be empty'] },
							],
						},
					},
				},
			},
			{
				request: {
					body: {
						title: 'Updated in Module 2',
						description: 'Module 2 Update',
						order: 10,
					},
					params: {
						id: '456',
					},
					query: {
						page: 2,
						limit: 20,
						q: 'module2',
					},
					headers: {
						'x-echo': 'module2-header',
						'x-mongo-id': '507f1f77bcf86cd799439011',
					},
				},
				response: {
					401: {
						description: 'Unauthorized',
						data: {
							error: 'Unauthorized',
							message: 'Missing or invalid authentication token',
						},
					},
				},
			},
			{
				request: {
					body: {
						title: 'Updated in Module 2',
						description: 'Module 2 Update',
						order: 10,
					},
					params: {
						id: '456',
					},
					query: {
						page: 2,
						limit: 20,
						q: 'module2',
					},
					headers: {
						'x-echo': 'module2-header',
						'x-mongo-id': '507f1f77bcf86cd799439011',
					},
				},
				response: {
					404: {
						description: 'Not found',
						data: {
							error: 'Not Found',
							message: 'Item with id 456 not found in module 2',
						},
					},
				},
			},
		],
	})
	@validate([{ params: IdParams }, { body: UpdateDto }])
	public update(
		@params() paramsObj: IdParams,
		@body() bodyObj: UpdateDto,
		@res() res: Response,
	): void {
		res.setHeader('x-handler', 'update');
		res.json({
			ok: true,
			route: `PUT /test2/${paramsObj?.id}`,
			params: paramsObj,
			body: bodyObj,
		});
	}

	@patch('/:id', 'Patch2')
	@validate([{ params: IdParams }, { body: UpdateDto }])
	public patchOne(
		@params() paramsObj: IdParams,
		@body() bodyObj: UpdateDto,
		@res() res: Response,
	): void {
		res.setHeader('x-handler', 'patch');
		res.json({
			ok: true,
			route: `PATCH /test2/${paramsObj?.id}`,
			params: paramsObj,
			body: bodyObj,
		});
	}

	@del('/:id', 'Delete2')
	@validate({ params: IdParams })
	@authorized(['admin'])
	public remove(@params() paramsObj: IdParams, @res() res: Response): void {
		res.setHeader('x-handler', 'delete');
		res.json({
			ok: true,
			route: `DELETE /test2/${paramsObj?.id}`,
			params: paramsObj,
		});
	}

	@get('/secured', 'Secured2 GET')
	@authenticated()
	public secured(@req() req: Request, @res() res: Response): void {
		res.setHeader('x-handler', 'secured');
		res.json({
			ok: true,
			route: 'GET /test2/secured',
			user: (req as any).user ?? null,
		});
	}

	@get('/custom', 'Custom2 meta/mw test')
	@custom('tags', ['demo', 'test'])
	@middleware((req, _res, next) => {
		(req as any).customInjected = true;
		next();
	})
	public customMeta(@req() req: Request, @res() res: Response): void {
		res.setHeader('x-handler', 'custom');
		res.json({
			ok: true,
			route: 'GET /test2/custom',
			customInjected: (req as any).customInjected === true,
		});
	}

	@get('/next-error', 'Next2 error')
	public nextError(
		@req() _req: Request,
		@res() _res: Response,
		@next() next: NextFunction,
	): void {
		next(new Error('Manual error from /test2/next-error'));
	}

	@get('/registry', 'Registry2 dump')
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
	@get('/validate-header', 'Validate2 header')
	@validate({ headers: TestHeaderValidationDto })
	public validateHeader(@req() req: Request): ResponseBuilder<any> {
		const headers = req.headers as any;
		const echoHeader = headers['x-echo'] ?? null;
		const mongoId = headers['x-mongo-id'] ?? null;
		console.log('Header validation:', { echoHeader, mongoId });
		return new ResponseBuilder().ok({
			route: 'GET /test2/validate-header',
			echo: echoHeader ?? null,
		});
	}
	@get('/validate-header-custom-error', 'Validate header with custom http error')
	@validate({
		headers: TestHeaderValidationDto,
		customHttpError: new UnauthorizedException({ message: 'Not Authorized' }),
	})
	public validateHeaderCustomError(@req() req: Request): ResponseBuilder<any> {
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
