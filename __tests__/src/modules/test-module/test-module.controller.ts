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
@controller('/test', 'Test Controller', 'Test Module')
// @ts-ignore
export class TestController extends Controller implements IController {
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

	@post('/create', 'Create', {
		examples: [
			{
				request: {
					body: {
						title: 'Test Item',
						description: 'Test Description',
						order: 1,
					},
				},
				response: {
					201: {
						description: 'Item created successfully',
						data: {
							ok: true,
							route: 'POST /test/create',
							body: { title: 'Test Item', description: 'Test Description', order: 1 },
							echo: null,
						},
					},
				},
			},
			{
				request: {
					body: {
						title: '',
						description: 'Test Description',
						order: 1,
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
// Set timestamp for tracking
pm.environment.set("requestTimestamp", new Date().toISOString());

// Generate unique ID
pm.environment.set("uniqueId", pm.variables.replaceIn('{{$randomUUID}}'));

console.log("Pre-request: Creating item at", pm.environment.get("requestTimestamp"));
	`)
	@testScript(`
// Test response status
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

// Test response structure
pm.test("Response has correct structure", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('ok');
    pm.expect(jsonData).to.have.property('route');
    pm.expect(jsonData.ok).to.be.true;
});

// Test response time
pm.test("Response time is less than 500ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// Save response data to environment
var jsonData = pm.response.json();
if (jsonData.body && jsonData.body.title) {
    pm.environment.set("createdItemTitle", jsonData.body.title);
}

console.log("Post-request: Item created successfully");
	`)
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

	@put('/:id', 'Update', {
		examples: [
			{
				request: {
					body: {
						title: 'Updated Title',
						description: 'Updated Description',
						order: 5,
					},
					params: {
						id: '123',
					},
					query: {
						page: 1,
						limit: 10,
						q: 'test',
					},
					headers: {
						'x-echo': 'my-header-value',
						'x-mongo-id': '507f1f77bcf86cd799439011',
					},
				},
				response: {
					200: {
						description: 'Item updated successfully',
						data: {
							ok: true,
							route: 'PUT /test/123',
							params: { id: '123' },
							body: {
								title: 'Updated Title',
								description: 'Updated Description',
								order: 5,
							},
							query: { page: 1, limit: 10, q: 'test' },
						},
					},
				},
			},
			{
				request: {
					body: {
						title: '',
						description: 'Updated Description',
						order: 5,
					},
					params: {
						id: '123',
					},
					query: {
						page: 1,
						limit: 10,
						q: 'test',
					},
					headers: {
						'x-echo': 'my-header-value',
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
						title: 'Updated Title',
						description: 'Updated Description',
						order: 5,
					},
					params: {
						id: '123',
					},
					query: {
						page: 1,
						limit: 10,
						q: 'test',
					},
					headers: {
						'x-echo': 'my-header-value',
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
						title: 'Updated Title',
						description: 'Updated Description',
						order: 5,
					},
					params: {
						id: '123',
					},
					query: {
						page: 1,
						limit: 10,
						q: 'test',
					},
					headers: {
						'x-echo': 'my-header-value',
						'x-mongo-id': '507f1f77bcf86cd799439011',
					},
				},
				response: {
					404: {
						description: 'Not found',
						data: {
							error: 'Not Found',
							message: 'Item with id 123 not found',
						},
					},
				},
			},
		],
	})
	@preRequestScript(`
// Set authorization header if token exists
const token = pm.environment.get("authToken");
if (token) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + token
    });
}

// Validate request body before sending
const requestBody = JSON.parse(pm.request.body.raw);
pm.expect(requestBody).to.have.property('title');

console.log("Pre-request: Updating item with ID", pm.request.url.getPath().split('/').pop());
	`)
	@testScript(`
// Test response status
pm.test("Status code is 200 or error code", function () {
    pm.expect([200, 400, 401, 404]).to.include(pm.response.code);
});

// Handle success response
if (pm.response.code === 200) {
    pm.test("Update successful", function () {
        var jsonData = pm.response.json();
        pm.expect(jsonData.ok).to.be.true;
        pm.expect(jsonData.body).to.have.property('title');
    });
    
    // Save updated item data
    var jsonData = pm.response.json();
    pm.environment.set("lastUpdatedItem", JSON.stringify(jsonData.body));
}

// Handle error responses
if (pm.response.code === 404) {
    pm.test("Item not found error is properly formatted", function () {
        var jsonData = pm.response.json();
        pm.expect(jsonData).to.have.property('error');
        pm.expect(jsonData.error).to.equal('Not Found');
    });
}

// Verify response time
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});

console.log("Post-request: Update operation completed with status", pm.response.code);
	`)
	@validate([{ params: IdParams }, { body: UpdateDto }])
	public update(
		@params() paramsObj: IdParams,
		@body() bodyObj: UpdateDto,
		@res() res: Response,
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
		@res() res: Response,
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
		@next() next: NextFunction,
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
