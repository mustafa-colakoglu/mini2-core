// __tests__/swagger-scripts.test.ts
import 'reflect-metadata';
import { Express } from 'express';
import request from 'supertest';
import { container, IApp, MINI_TYPES } from '../index';

describe('Swagger Pre/Post Scripts', () => {
	let app: Express;
	const appFromContainer: IApp = container.get(MINI_TYPES.IApp);

	beforeAll(async () => {
		await appFromContainer.init(
			{
				host: 'localhost',
				port: 3006,
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
				console.log('swagger scripts test server closed');
				resolve(true);
			});
		});
	});

	describe('Postman Pre-Request Scripts', () => {
		it('should include pre-request script for POST /test/create', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test/create']?.post;
			
			expect(postCreatePath).toBeDefined();
			expect(postCreatePath['x-postman-prerequest']).toBeDefined();
			expect(postCreatePath['x-postman-prerequest'].script).toBeDefined();
			expect(postCreatePath['x-postman-prerequest'].script.type).toBe('text/javascript');
			expect(postCreatePath['x-postman-prerequest'].script.exec).toBeInstanceOf(Array);
			expect(postCreatePath['x-postman-prerequest'].script.exec.length).toBeGreaterThan(0);
			
			// Check script content
			const scriptContent = postCreatePath['x-postman-prerequest'].script.exec.join('\n');
			expect(scriptContent).toContain('pm.environment.set');
			expect(scriptContent).toContain('requestTimestamp');
		});

		it('should include pre-request script for PUT /test/{id}', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const putUpdatePath = spec.paths['/test/{id}']?.put;
			
			expect(putUpdatePath).toBeDefined();
			expect(putUpdatePath['x-postman-prerequest']).toBeDefined();
			
			const scriptContent = putUpdatePath['x-postman-prerequest'].script.exec.join('\n');
			expect(scriptContent).toContain('authToken');
			expect(scriptContent).toContain('Authorization');
		});
	});

	describe('Postman Test Scripts', () => {
		it('should include test script for POST /test/create', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test/create']?.post;
			
			expect(postCreatePath).toBeDefined();
			expect(postCreatePath['x-postman-test']).toBeDefined();
			expect(postCreatePath['x-postman-test'].script).toBeDefined();
			expect(postCreatePath['x-postman-test'].script.type).toBe('text/javascript');
			expect(postCreatePath['x-postman-test'].script.exec).toBeInstanceOf(Array);
			
			// Check script content
			const scriptContent = postCreatePath['x-postman-test'].script.exec.join('\n');
			expect(scriptContent).toContain('pm.test');
			expect(scriptContent).toContain('Status code is 201');
			expect(scriptContent).toContain('pm.response.to.have.status');
		});

		it('should include test script for PUT /test/{id}', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const putUpdatePath = spec.paths['/test/{id}']?.put;
			
			expect(putUpdatePath).toBeDefined();
			expect(putUpdatePath['x-postman-test']).toBeDefined();
			
			const scriptContent = putUpdatePath['x-postman-test'].script.exec.join('\n');
			expect(scriptContent).toContain('pm.test');
			expect(scriptContent).toContain('lastUpdatedItem');
			expect(scriptContent).toContain('Response time is acceptable');
		});
	});

	describe('Module 2 Scripts', () => {
		it('should include scripts for Module 2 endpoints', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const module2CreatePath = spec.paths['/test2/create']?.post;
			
			expect(module2CreatePath).toBeDefined();
			expect(module2CreatePath['x-postman-prerequest']).toBeDefined();
			expect(module2CreatePath['x-postman-test']).toBeDefined();
			
			// Check module-specific content
			const preScript = module2CreatePath['x-postman-prerequest'].script.exec.join('\n');
			expect(preScript).toContain('Module 2');
			
			const testScript = module2CreatePath['x-postman-test'].script.exec.join('\n');
			expect(testScript).toContain('test2');
		});
	});

	describe('Script Format Validation', () => {
		it('should format scripts correctly for Postman import', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			const postCreatePath = spec.paths['/test/create']?.post;
			
			// Validate structure for Postman compatibility
			expect(postCreatePath['x-postman-prerequest'].script).toMatchObject({
				type: 'text/javascript',
				exec: expect.any(Array),
			});
			
			expect(postCreatePath['x-postman-test'].script).toMatchObject({
				type: 'text/javascript',
				exec: expect.any(Array),
			});
			
			// Each line should be a separate array element
			expect(postCreatePath['x-postman-test'].script.exec.every((line: any) => typeof line === 'string')).toBe(true);
		});
	});
});
