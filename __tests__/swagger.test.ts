// __tests__/swagger.test.ts
import 'reflect-metadata';
import { Express } from 'express';
import request from 'supertest';
import { container, IApp, MINI_TYPES } from '../index';

describe('Swagger JSON Integration', () => {
	let app: Express;
	const appFromContainer: IApp = container.get(MINI_TYPES.IApp);

	beforeAll(async () => {
		await appFromContainer.init(
			{
				host: 'localhost',
				port: 3000,
				applicationName: 'Test Application',
			},
			{
				autoload: true,
				...(process.env.NODE_ENV === 'production'
					? {
							extensions: ['.js', '.cjs', '.mjs'],
							workingDirectory: __dirname + '/dist',
							patterns: ['**/*.(js|cjs|mjs)'],
					  }
					: {
							workingDirectory: __dirname + '/src',
							extensions: ['.ts', '.mts', '.cts'],
							patterns: ['**/*.(ts|js)'],
					  }),
				logging: false,
			}
		);
		await appFromContainer.afterInit();
		app = appFromContainer.getApp();
	});

	afterAll(async () => {
		return new Promise((resolve) => {
			appFromContainer.server.close(() => {
				console.log('swagger test server closed');
				resolve(true);
			});
		});
	});

	describe('General Swagger Spec', () => {
		it('GET /api-docs.json returns 200', async () => {
			const res = await request(app).get('/api-docs.json');
			expect(res.status).toBe(200);
			expect(res.headers['content-type']).toContain('application/json');
		});

		it('returns valid OpenAPI 3.0.0 spec', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			
			expect(spec.openapi).toBe('3.0.0');
			expect(spec.info).toBeDefined();
			expect(spec.info.title).toBeDefined();
			expect(spec.info.version).toBeDefined();
		});

		it('contains paths and components', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			
			expect(spec.paths).toBeDefined();
			expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
			expect(spec.components).toBeDefined();
			expect(spec.components.schemas).toBeDefined();
		});
	});

	describe('Test Module - POST /test/create', () => {
		it('has request body schema reference', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test/create']?.post;
			
			expect(postCreatePath).toBeDefined();
			expect(postCreatePath.requestBody).toBeDefined();
			expect(postCreatePath.requestBody.content['application/json']).toBeDefined();
			expect(postCreatePath.requestBody.content['application/json'].schema.$ref).toContain('CreateDto');
			
			// Check that CreateDto exists in components
			expect(spec.components.schemas.CreateDto).toBeDefined();
		});

		it('has 201 response with correct example', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test/create']?.post;
			
			expect(postCreatePath.responses['201']).toBeDefined();
			expect(postCreatePath.responses['201'].description).toBe('Item created successfully');
			expect(postCreatePath.responses['201'].content['application/json']).toBeDefined();
			expect(postCreatePath.responses['201'].content['application/json'].example).toMatchObject({
				ok: true,
				route: 'POST /test/create'
			});
			expect(postCreatePath.responses['201'].content['application/json'].example.body).toBeDefined();
			expect(postCreatePath.responses['201'].content['application/json'].example.body.title).toBe('Test Item');
		});

		it('has 400 response with validation error', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test/create']?.post;
			
			expect(postCreatePath.responses['400']).toBeDefined();
			expect(postCreatePath.responses['400'].description).toBe('Validation error');
			expect(postCreatePath.responses['400'].content['application/json'].example).toBeDefined();
			expect(postCreatePath.responses['400'].content['application/json'].example.error).toBe('Validation failed');
			expect(postCreatePath.responses['400'].content['application/json'].example.validationErrors).toBeDefined();
		});
	});

	describe('Test Module - PUT /test/{id}', () => {
		it('has all request schemas (body, params, query, headers)', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const putUpdatePath = spec.paths['/test/{id}']?.put;
			
			expect(putUpdatePath).toBeDefined();
			
			// Check request body (UpdateDto)
			expect(putUpdatePath.requestBody).toBeDefined();
			expect(putUpdatePath.requestBody.content['application/json'].schema.$ref).toContain('UpdateDto');
			
			// Check components exist
			expect(spec.components.schemas.UpdateDto).toBeDefined();
			expect(spec.components.schemas.IdParams).toBeDefined();
			expect(spec.components.schemas.QueryDto).toBeDefined();
			expect(spec.components.schemas.TestHeaderValidationDto).toBeDefined();
		});

		it('has all response examples (200, 400, 401, 404)', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const putUpdatePath = spec.paths['/test/{id}']?.put;
			
			// Check 200 response
			expect(putUpdatePath.responses['200']).toBeDefined();
			expect(putUpdatePath.responses['200'].description).toBe('Item updated successfully');
			expect(putUpdatePath.responses['200'].content['application/json'].example).toMatchObject({
				ok: true,
				route: 'PUT /test/123'
			});
			
			// Check 400 response
			expect(putUpdatePath.responses['400']).toBeDefined();
			expect(putUpdatePath.responses['400'].description).toBe('Validation error');
			
			// Check 401 response
			expect(putUpdatePath.responses['401']).toBeDefined();
			expect(putUpdatePath.responses['401'].description).toBe('Unauthorized');
			
			// Check 404 response
			expect(putUpdatePath.responses['404']).toBeDefined();
			expect(putUpdatePath.responses['404'].description).toBe('Not found');
		});
	});

	describe('Test Module 2 - POST /test2/create', () => {
		it('has request body schema reference', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test2/create']?.post;
			
			expect(postCreatePath).toBeDefined();
			expect(postCreatePath.requestBody).toBeDefined();
			expect(postCreatePath.requestBody.content['application/json']).toBeDefined();
			expect(postCreatePath.requestBody.content['application/json'].schema.$ref).toContain('CreateDto');
		});

		it('has 201 response with correct example', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test2/create']?.post;
			
			expect(postCreatePath.responses['201']).toBeDefined();
			expect(postCreatePath.responses['201'].description).toBe('Item created successfully in module 2');
			expect(postCreatePath.responses['201'].content['application/json']).toBeDefined();
			expect(postCreatePath.responses['201'].content['application/json'].example).toMatchObject({
				ok: true,
				route: 'POST /test2/create'
			});
			expect(postCreatePath.responses['201'].content['application/json'].example.body).toBeDefined();
			expect(postCreatePath.responses['201'].content['application/json'].example.body.title).toBe('Module 2 Item');
		});

		it('has 400 response with validation error', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test2/create']?.post;
			
			expect(postCreatePath.responses['400']).toBeDefined();
			expect(postCreatePath.responses['400'].description).toBe('Validation error');
			expect(postCreatePath.responses['400'].content['application/json'].example).toBeDefined();
			expect(postCreatePath.responses['400'].content['application/json'].example.error).toBe('Validation failed');
		});
	});

	describe('Test Module 2 - PUT /test2/{id}', () => {
		it('has all request schemas', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const putUpdatePath = spec.paths['/test2/{id}']?.put;
			
			expect(putUpdatePath).toBeDefined();
			
			// Check request body (UpdateDto)
			expect(putUpdatePath.requestBody).toBeDefined();
			expect(putUpdatePath.requestBody.content['application/json'].schema.$ref).toContain('UpdateDto');
		});

		it('has all response examples (200, 400, 401, 404)', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const putUpdatePath = spec.paths['/test2/{id}']?.put;
			
			// Check 200 response
			expect(putUpdatePath.responses['200']).toBeDefined();
			expect(putUpdatePath.responses['200'].description).toBe('Item updated successfully in module 2');
			expect(putUpdatePath.responses['200'].content['application/json'].example).toMatchObject({
				ok: true,
				route: 'PUT /test2/456'
			});
			
			// Check 400 response
			expect(putUpdatePath.responses['400']).toBeDefined();
			expect(putUpdatePath.responses['400'].description).toBe('Validation error');
			
			// Check 401 response
			expect(putUpdatePath.responses['401']).toBeDefined();
			expect(putUpdatePath.responses['401'].description).toBe('Unauthorized');
			
			// Check 404 response
			expect(putUpdatePath.responses['404']).toBeDefined();
			expect(putUpdatePath.responses['404'].description).toBe('Not found');
			expect(putUpdatePath.responses['404'].content['application/json'].example.message).toContain('module 2');
		});
	});
});
