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
			
			// Check inferred schema structure
			const schema = postCreatePath.requestBody.content['application/json'].schema;
			expect(schema.type).toBe('object');
			expect(schema.properties).toBeDefined();
			expect(schema.properties.title).toEqual({ type: 'string' });
			expect(schema.properties.order).toEqual({ type: 'integer' });
			expect(schema.required).toContain('title');
			
			// Check example
			const example = postCreatePath.requestBody.content['application/json'].example;
			expect(example.title).toBe('Test Item');
		});

		it('has 201 response with correct example', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test/create']?.post;
			
			expect(postCreatePath.responses['201']).toBeDefined();
			expect(postCreatePath.responses['201'].description).toBe('Item created successfully');
			expect(postCreatePath.responses['201'].content['application/json']).toBeDefined();
			
			// Check both example and examples (Swagger UI and Postman compatibility)
			const responseContent = postCreatePath.responses['201'].content['application/json'];
			expect(responseContent.example).toMatchObject({
				ok: true,
				route: 'POST /test/create'
			});
			expect(responseContent.examples).toBeDefined();
			expect(responseContent.examples.default.value).toMatchObject({
				ok: true,
				route: 'POST /test/create'
			});
			expect(responseContent.example.body.title).toBe('Test Item');
		});

		it('has 400 response with validation error', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test/create']?.post;
			
			expect(postCreatePath.responses['400']).toBeDefined();
			expect(postCreatePath.responses['400'].description).toBe('Validation error');
			
			const responseContent = postCreatePath.responses['400'].content['application/json'];
			expect(responseContent.example).toBeDefined();
			expect(responseContent.example.error).toBe('Validation failed');
			expect(responseContent.example.validationErrors).toBeDefined();
			
			// Check Postman compatibility
			expect(responseContent.examples.default.value.error).toBe('Validation failed');
		});
	});

	describe('Test Module - PUT /test/{id}', () => {
		it('has all request schemas (body, params, query, headers)', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const putUpdatePath = spec.paths['/test/{id}']?.put;
			
			expect(putUpdatePath).toBeDefined();
			
			// Check request body schema
			expect(putUpdatePath.requestBody).toBeDefined();
			const bodySchema = putUpdatePath.requestBody.content['application/json'].schema;
			expect(bodySchema.type).toBe('object');
			expect(bodySchema.properties.title).toBeDefined();
			expect(bodySchema.properties.order).toEqual({ type: 'integer' });
			
			// Check body example
			const bodyExample = putUpdatePath.requestBody.content['application/json'].example;
			expect(bodyExample.title).toBe('Updated Title');
			
			// Check parameters (params, query, headers)
			expect(putUpdatePath.parameters).toBeDefined();
			expect(putUpdatePath.parameters.length).toBeGreaterThan(0);
			
			// Check if path param exists
			const pathParam = putUpdatePath.parameters.find((p: any) => p.in === 'path' && p.name === 'id');
			expect(pathParam).toBeDefined();
			if (pathParam.example !== undefined) {
				expect(pathParam.example).toBe('123');
			}
			
			// Check if query params exist (page, limit, q)
			const pageParam = putUpdatePath.parameters.find((p: any) => p.in === 'query' && p.name === 'page');
			const limitParam = putUpdatePath.parameters.find((p: any) => p.in === 'query' && p.name === 'limit');
			const qParam = putUpdatePath.parameters.find((p: any) => p.in === 'query' && p.name === 'q');
			expect(pageParam).toBeDefined();
			expect(limitParam).toBeDefined();
			expect(qParam).toBeDefined();
			
			// Check if headers exist
			const echoHeader = putUpdatePath.parameters.find((p: any) => p.in === 'header' && p.name === 'x-echo');
			const mongoIdHeader = putUpdatePath.parameters.find((p: any) => p.in === 'header' && p.name === 'x-mongo-id');
			expect(echoHeader).toBeDefined();
			expect(mongoIdHeader).toBeDefined();
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
			
			// Check inferred schema
			const schema = postCreatePath.requestBody.content['application/json'].schema;
			expect(schema.type).toBe('object');
			expect(schema.properties).toBeDefined();
			expect(schema.properties.title).toEqual({ type: 'string' });
			
			// Check example
			const example = postCreatePath.requestBody.content['application/json'].example;
			expect(example.title).toBe('Module 2 Item');
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
			
			// Check request body schema
			expect(putUpdatePath.requestBody).toBeDefined();
			const bodySchema = putUpdatePath.requestBody.content['application/json'].schema;
			expect(bodySchema.type).toBe('object');
			expect(bodySchema.properties).toBeDefined();
			
			// Check parameters exist
			expect(putUpdatePath.parameters).toBeDefined();
			expect(putUpdatePath.parameters.length).toBeGreaterThan(0);
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
