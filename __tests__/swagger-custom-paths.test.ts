// __tests__/swagger-custom-paths.test.ts
import 'reflect-metadata';
import { Express } from 'express';
import request from 'supertest';
import { container, IApp, MINI_TYPES } from '../index';

describe('Swagger Custom Paths Configuration', () => {
	let app: Express;
	const appFromContainer: IApp = container.get(MINI_TYPES.IApp);

	beforeAll(async () => {
		await appFromContainer.init(
			{
				host: 'localhost',
				port: 3001,
				applicationName: 'Test Application',
				swaggerDocsPath: '/custom-docs',
				swaggerJsonPath: '/custom-api.json',
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
				console.log('custom paths test server closed');
				resolve(true);
			});
		});
	});

	describe('Custom Swagger Endpoints', () => {
		it('GET /custom-api.json returns 200', async () => {
			const res = await request(app).get('/custom-api.json');
			expect(res.status).toBe(200);
			expect(res.headers['content-type']).toContain('application/json');
		});

		it('returns valid OpenAPI spec on custom path', async () => {
			const res = await request(app).get('/custom-api.json');
			const spec = res.body;
			
			expect(spec.openapi).toBe('3.0.0');
			expect(spec.info.title).toBe('Test Application');
			expect(spec.paths).toBeDefined();
		});

		it('default path /api-docs.json should not work', async () => {
			const res = await request(app).get('/api-docs.json');
			expect(res.status).toBe(404);
		});
	});
});
