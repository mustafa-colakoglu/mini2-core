// __tests__/swagger-servers.test.ts
import 'reflect-metadata';
import { Express } from 'express';
import request from 'supertest';
import { container, IApp, MINI_TYPES } from '../index';

describe('Swagger Servers Configuration', () => {
	let app: Express;
	const appFromContainer: IApp = container.get(MINI_TYPES.IApp);

	beforeAll(async () => {
		await appFromContainer.init(
			{
				host: 'localhost',
				port: 3002,
				applicationName: 'Multi-Environment API',
				swaggerServers: [
					{
						url: 'https://api.production.com',
						description: 'Production server',
					},
					{
						url: 'https://api.staging.com',
						description: 'Staging server',
					},
					{
						url: 'http://localhost:3002',
						description: 'Local development server',
					},
				],
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
				console.log('swagger servers test closed');
				resolve(true);
			});
		});
	});

	describe('Custom Swagger Servers', () => {
		it('should have multiple servers configured', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			
			expect(spec.servers).toBeDefined();
			expect(Array.isArray(spec.servers)).toBe(true);
			expect(spec.servers.length).toBe(3);
		});

		it('should have production server', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			
			const prodServer = spec.servers.find(
				(s: any) => s.url === 'https://api.production.com'
			);
			expect(prodServer).toBeDefined();
			expect(prodServer.description).toBe('Production server');
		});

		it('should have staging server', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			
			const stagingServer = spec.servers.find(
				(s: any) => s.url === 'https://api.staging.com'
			);
			expect(stagingServer).toBeDefined();
			expect(stagingServer.description).toBe('Staging server');
		});

		it('should have local development server', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			
			const localServer = spec.servers.find(
				(s: any) => s.url === 'http://localhost:3002'
			);
			expect(localServer).toBeDefined();
			expect(localServer.description).toBe('Local development server');
		});
	});

	describe('Server Array Order', () => {
		it('should have servers in the correct order', async () => {
			const res = await request(app).get('/api-docs.json');
			const spec = res.body;
			
			expect(spec.servers[0].url).toBe('https://api.production.com');
			expect(spec.servers[1].url).toBe('https://api.staging.com');
			expect(spec.servers[2].url).toBe('http://localhost:3002');
		});
	});
});
