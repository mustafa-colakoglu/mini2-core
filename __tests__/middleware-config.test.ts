import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { applyDefaultMiddlewares } from '../utils/default-middleware';

describe('applyDefaultMiddlewares', () => {
	it('registers parsers and accepts JSON bodies (default cors/morgan)', async () => {
		const app = express();
		applyDefaultMiddlewares(app, {
			host: 'localhost',
			port: 3000,
			applicationName: 'test',
		});
		app.post('/echo', (req, res) => {
			res.json(req.body);
		});

		const res = await request(app)
			.post('/echo')
			.send({ hello: 'world' })
			.set('Content-Type', 'application/json');
		expect(res.status).toBe(200);
		expect(res.body).toEqual({ hello: 'world' });
	});

	it('allows disabling cors and morgan without breaking parsers', async () => {
		const app = express();
		applyDefaultMiddlewares(app, {
			host: 'localhost',
			port: 3000,
			applicationName: 'test',
			middleware: { cors: false, morgan: false },
		});
		app.get('/ok', (_req, res) => res.sendStatus(204));

		expect((await request(app).get('/ok')).status).toBe(204);
	});
});
