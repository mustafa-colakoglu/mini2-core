import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { buildApp, controller, Controller, get, Mini2AppClass, res } from '../index';
import { Response } from 'express';
import { setupApiDocumentation } from '../api-docs/setup-api-docs';

const TEST_PORT = 3020;

@controller('/probe')
class ProbeController extends Controller {
	@get('/ok', 'Probe OK')
	public ok(@res() response: Response): void {
		response.json({ ok: true });
	}
}

describe('API documentation exposure (default off)', () => {
	it('legacy App path: no docs config returns 404 for doc endpoints', async () => {
		const app = express();
		app.use(express.json());
		const controllers = [new ProbeController()];
		setupApiDocumentation(
			app,
			{
				host: 'localhost',
				port: 3000,
				applicationName: 'No Docs App',
			},
			controllers,
		);
		buildApp(app, controllers);

		expect((await request(app).get('/api-docs.json')).status).toBe(404);
		expect((await request(app).get('/postman.json')).status).toBe(404);
		expect((await request(app).get('/api-docs/')).status).toBe(404);
	});

	it('docs.enabled:true exposes swagger and postman json', async () => {
		const app = express();
		app.use(express.json());
		const controllers = [new ProbeController()];
		setupApiDocumentation(
			app,
			{
				host: 'localhost',
				port: 3000,
				applicationName: 'Docs On App',
				docs: { enabled: true },
			},
			controllers,
		);
		buildApp(app, controllers);

		expect((await request(app).get('/api-docs.json')).status).toBe(200);
		expect((await request(app).get('/postman.json')).status).toBe(200);
	});
});

class DocsOffMini2App extends Mini2AppClass {
	protected resolveConfig() {
		return {
			host: 'localhost',
			port: TEST_PORT,
			applicationName: 'Mini2 No Docs',
		};
	}
}

describe('Mini2App without docs config', () => {
	let app: DocsOffMini2App;

	beforeAll(async () => {
		app = new DocsOffMini2App();
		await app.start();
	});

	afterAll(async () => {
		await app.stop();
	});

	it('returns 404 for documentation endpoints', async () => {
		expect((await request(app.getApp()).get('/api-docs.json')).status).toBe(404);
		expect((await request(app.getApp()).get('/postman.json')).status).toBe(404);
	});
});
