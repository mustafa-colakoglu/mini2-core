// __tests__/swagger-basic-auth.test.ts
import 'reflect-metadata';
import { Express } from 'express';
import request from 'supertest';
import { container, IApp, MINI_TYPES } from '../index';

describe('Swagger Basic Authentication', () => {
	let app: Express;
	const appFromContainer: IApp = container.get(MINI_TYPES.IApp);

	beforeAll(async () => {
		await appFromContainer.init(
			{
				host: 'localhost',
				port: 3004,
				applicationName: 'Protected API',
				swaggerBasicAuth: {
					username: 'admin',
					password: 'secret123',
				},
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
				console.log('basic auth test server closed');
				resolve(true);
			});
		});
	});

	describe('Protected Swagger JSON Endpoint', () => {
		it('should return 401 without credentials', async () => {
			const res = await request(app).get('/api-docs.json');
			expect(res.status).toBe(401);
			expect(res.text).toBe('Authentication required');
			expect(res.headers['www-authenticate']).toBe('Basic realm="Swagger Documentation"');
		});

		it('should return 401 with invalid credentials', async () => {
			const res = await request(app)
				.get('/api-docs.json')
				.auth('admin', 'wrongpassword');
			
			expect(res.status).toBe(401);
			expect(res.text).toBe('Invalid credentials');
		});

		it('should return 200 with valid credentials', async () => {
			const res = await request(app)
				.get('/api-docs.json')
				.auth('admin', 'secret123');
			
			expect(res.status).toBe(200);
			expect(res.headers['content-type']).toContain('application/json');
			expect(res.body.openapi).toBe('3.0.0');
		});
	});

	describe('Protected Swagger UI Endpoint', () => {
		it('should return 401 without credentials for UI', async () => {
			const res = await request(app).get('/api-docs/');
			expect(res.status).toBe(401);
			expect(res.text).toBe('Authentication required');
		});

		it('should return 401 with invalid credentials for UI', async () => {
			const res = await request(app)
				.get('/api-docs/')
				.auth('wrong', 'credentials');
			
			expect(res.status).toBe(401);
			expect(res.text).toBe('Invalid credentials');
		});

		it('should allow access to UI with valid credentials', async () => {
			const res = await request(app)
				.get('/api-docs/')
				.auth('admin', 'secret123');
			
			expect(res.status).toBe(200);
		});
	});

	describe('Different Username/Password Combinations', () => {
		it('should reject with correct username but wrong password', async () => {
			const res = await request(app)
				.get('/api-docs.json')
				.auth('admin', 'wrongpass');
			
			expect(res.status).toBe(401);
			expect(res.text).toBe('Invalid credentials');
		});

		it('should reject with wrong username but correct password', async () => {
			const res = await request(app)
				.get('/api-docs.json')
				.auth('wronguser', 'secret123');
			
			expect(res.status).toBe(401);
			expect(res.text).toBe('Invalid credentials');
		});

		it('should reject with empty credentials', async () => {
			const res = await request(app)
				.get('/api-docs.json')
				.auth('', '');
			
			expect(res.status).toBe(401);
			expect(res.text).toBe('Invalid credentials');
		});
	});
});
