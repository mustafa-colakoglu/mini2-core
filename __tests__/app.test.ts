// __tests__/app.test.ts
import 'reflect-metadata';
import { Express } from 'express';
import request from 'supertest';
import { container, IApp, MINI_TYPES } from '../index';
/* ----------------------------- Test app builder ----------------------------- */

const appFromContainer: IApp = container.get(MINI_TYPES.IApp);
let app!: Express;
beforeAll(async () => {
	await appFromContainer.init(
		{
			host: 'localhost',
			port: 3000,
			applicationName: 'Test Application',
		},
		{
			srcDir: __dirname + '/src',
			distDir: 'dist',
			patterns: ['**/*.(ts|js)'],
		}
	);
	await appFromContainer.afterInit();
	app = appFromContainer.getApp();
});
afterAll(async () => {
	await appFromContainer.server.close();
});
/* --------------------------------- Tests ---------------------------------- */
describe('Test controller (integration)', () => {
	it('GET /test -> 200', async () => {
		const res_ = await request(app).get('/test');
		expect(res_.status).toBe(200);
		expect(res_.headers['x-handler']).toBe('root');
		expect(res_.body).toEqual(
			expect.objectContaining({ ok: true, route: 'GET /test', basePath: '/test' })
		);
	});

	it('GET /test/query -> 200 & returns query', async () => {
		const res_ = await request(app).get('/test/query?page=2&limit=10&q=hello');
		expect(res_.status).toBe(200);
		expect(res_.headers['x-handler']).toBe('query');
		expect(res_.body.route).toBe('GET /test/query');
		expect(res_.body.query).toEqual(
			expect.objectContaining({ page: 2, limit: 10, q: 'hello' })
		);
	});

	it('POST /test/create -> 201 & echoes header', async () => {
		const res_ = await request(app)
			.post('/test/create')
			.set('x-echo', 'hi')
			.send({ title: 'hello', description: 'world', order: 1 });
		expect(res_.status).toBe(201);
		expect(res_.headers['x-handler']).toBe('create');
		expect(res_.body.route).toBe('POST /test/create');
		expect(res_.body.body).toEqual(
			expect.objectContaining({ title: 'hello', order: 1 })
		);
		expect(res_.body.echo).toBe('hi');
	});

	it('PUT /test/:id -> 200', async () => {
		const res_ = await request(app)
			.put('/test/abc123')
			.send({ title: 'updated', description: 'desc2', order: 9 });
		expect(res_.status).toBe(200);
		expect(res_.headers['x-handler']).toBe('update');
		expect(res_.body.route).toBe('PUT /test/abc123');
		expect(res_.body.params).toEqual(expect.objectContaining({ id: 'abc123' }));
	});

	it('PATCH /test/:id -> 200', async () => {
		const res_ = await request(app)
			.patch('/test/xyz')
			.send({ description: 'patched' });
		expect(res_.status).toBe(200);
		expect(res_.headers['x-handler']).toBe('patch');
		expect(res_.body.route).toBe('PATCH /test/xyz');
	});

	it('DELETE /test/:id without permission -> 403', async () => {
		const res_ = await request(app)
			.delete('/test/foo')
			.set('x-authenticated', 'true'); // login var ama izin yok → ForbiddenException throw
		expect(res_.status).toBe(403);
	});

	it('DELETE /test/:id with admin permission -> 200', async () => {
		const res_ = await request(app)
			.delete('/test/foo')
			.set('x-authenticated', 'true')
			.set('x-user-permissions', 'admin'); // admin → geç
		expect(res_.status).toBe(200);
		expect(res_.headers['x-handler']).toBe('delete');
		expect(res_.body.route).toBe('DELETE /test/foo');
	});

	it('GET /test/secured without user -> 401', async () => {
		const res_ = await request(app).get('/test/secured');
		expect(res_.status).toBe(401);
	});

	it('GET /test/secured with user -> 200', async () => {
		const res_ = await request(app)
			.get('/test/secured')
			.set('x-authenticated', 'true')
			.set('x-user-id', 'u2')
			.set('x-user-permissions', 'reader');
		expect(res_.status).toBe(200);
		expect(res_.headers['x-handler']).toBe('secured');
		expect(res_.body.user).toEqual(expect.objectContaining({ id: 'u2' }));
	});

	it('GET /test/custom -> 200 (custom middleware)', async () => {
		const res_ = await request(app).get('/test/custom');
		expect(res_.status).toBe(200);
		expect(res_.headers['x-handler']).toBe('custom');
		expect(res_.body.customInjected).toBe(true);
	});

	it('GET /test/next-error -> 500 (next(err) path)', async () => {
		const res_ = await request(app).get('/test/next-error');
		expect(res_.status).toBe(500);
		// Senin global handler generic gövde döndürüyor:
		expect(res_.body).toEqual({ errorId: 1, message: 'Some error happen' });
	});

	it('GET /test/registry -> 200', async () => {
		const res_ = await request(app).get('/test/registry');
		expect(res_.status).toBe(200);
		expect(res_.headers['x-handler']).toBe('registry');
		expect(res_.body.basePath).toBe('/test');
		expect(Array.isArray(res_.body.routes)).toBe(true);
		expect(res_.body.routes.length).toBeGreaterThan(0);
	});

	it('GET /test/validate-header -> 400', async () => {
		const res_ = await request(app).get('/test/validate-header');
		expect(res_.status).toBe(400);
	});
	it('GET /test/validate-header -> 400', async () => {
		const res_ = await request(app)
			.get('/test/validate-header')
			.set('x-echo', 'my-header-value')
			.set('x-mongo-id', '507f1f77bcf86cd799439www');
		expect(res_.status).toBe(400);
	});
	it('GET /test/validate-header -> 200', async () => {
		const res_ = await request(app)
			.get('/test/validate-header')
			.set('x-echo', 'my-header-value')
			.set('x-mongo-id', '507f1f77bcf86cd799439011');
		expect(res_.status).toBe(200);
	});
});
