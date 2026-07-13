// __tests__/Mini2App.start.test.ts
// startMini2App / autoload kullanmadan, @Mini2App class'ını doğrudan
// container'dan alıp start() ile başlatmayı test eder.
import 'reflect-metadata';
import { Response } from 'express';
import request from 'supertest';
import {
	container,
	controller,
	Controller,
	get,
	Mini2App,
	Mini2AppClass,
	MINI_TYPES,
	res,
} from '../index';

const TEST_PORT = 3012;

@controller('/manual')
class ManualController extends Controller {
	constructor() {
		super();
	}

	@get('/status', 'Manual Status')
	public status(@res() response: Response): void {
		response.json({ ok: true, mode: 'manual' });
	}
}

@Mini2App()
class ManualStartApp extends Mini2AppClass {
	protected resolveConfig() {
		return {
			host: 'localhost',
			port: TEST_PORT,
			applicationName: 'Manual Start App',
		};
	}
}

describe('Mini2App manual start (without startMini2App)', () => {
	let app: ManualStartApp;

	beforeAll(async () => {
		// Autoload kapalı olduğu için controller'ı elle bind ediyoruz.
		container
			.bind(MINI_TYPES.IController)
			.to(ManualController)
			.inTransientScope();

		app = container.get<ManualStartApp>(MINI_TYPES.IAppV2);
		await app.start();
	});

	afterAll(async () => {
		await app.stop();
	});

	it('starts the server with config from resolveConfig()', () => {
		expect(app).toBeInstanceOf(ManualStartApp);
		expect(app.server).toBeDefined();
		expect(app.config.port).toBe(TEST_PORT);
		expect(app.config.applicationName).toBe('Manual Start App');
	});

	it('serves manually bound controller routes', async () => {
		const response = await request(app.getApp()).get('/manual/status');
		expect(response.status).toBe(200);
		expect(response.body).toEqual({ ok: true, mode: 'manual' });
	});

	it('serves swagger and postman endpoints', async () => {
		const swagger = await request(app.getApp()).get('/api-docs.json');
		expect(swagger.status).toBe(200);
		expect(swagger.body.info.title).toBe('Manual Start App');
		expect(swagger.body.paths['/manual/status']).toBeDefined();

		const postman = await request(app.getApp()).get('/postman.json');
		expect(postman.status).toBe(200);
		expect(postman.body.info.name).toBe('Manual Start App');
	});

	it('resolves the same singleton instance from the container', () => {
		expect(container.get(MINI_TYPES.IAppV2)).toBe(app);
	});
});
