// __tests__/Mini2App.test.ts
import 'reflect-metadata';
import request from 'supertest';
import {
	container,
	Mini2App,
	Mini2AppClass,
	MINI_TYPES,
	startMini2App,
} from '../index';
import {
	GREETING_SERVICE,
	GreetingService,
} from './di-fixtures/greeting.service';

const TEST_PORT = 3010;

@Mini2App()
class TestAppV2 extends Mini2AppClass {
	public beforeInitCalled = false;
	public afterInitCalled = false;

	protected resolveConfig() {
		return {
			host: 'localhost',
			port: TEST_PORT,
			applicationName: 'App V2 Test',
		};
	}

	protected async onBeforeInit(): Promise<void> {
		this.beforeInitCalled = true;
	}

	protected async onAfterInit(): Promise<void> {
		this.afterInitCalled = true;
	}
}

describe('AppV2 (Mini2App)', () => {
	let app: Mini2AppClass;

	beforeAll(async () => {
		app = await startMini2App({
			autoload: true,
			workingDirectory: __dirname + '/di-fixtures',
			extensions: ['.ts'],
			logging: false,
		});
	});

	afterAll(async () => {
		await app.stop();
	});

	it('starts the @Mini2App decorated class as a container singleton', () => {
		expect(app).toBeInstanceOf(TestAppV2);
		expect(container.get(MINI_TYPES.IAppV2)).toBe(app);
		expect(app.server).toBeDefined();
	});

	it('applies config from resolveConfig()', () => {
		expect(app.config).toEqual({
			host: 'localhost',
			port: TEST_PORT,
			applicationName: 'App V2 Test',
		});
	});

	it('runs onBeforeInit and onAfterInit hooks', () => {
		const testApp = app as TestAppV2;
		expect(testApp.beforeInitCalled).toBe(true);
		expect(testApp.afterInitCalled).toBe(true);
	});

	it('serves routes of autoloaded controllers', async () => {
		const response = await request(app.getApp()).get('/hello');
		expect(response.status).toBe(200);
		expect(response.body).toEqual({ message: 'hello from v2' });
	});

	it('serves the swagger json endpoint', async () => {
		const response = await request(app.getApp()).get('/api-docs.json');
		expect(response.status).toBe(200);
		expect(response.body.openapi).toBe('3.0.0');
		expect(response.body.info.title).toBe('App V2 Test');
		const helloPath = Object.keys(response.body.paths).find(
			(path) => path.replace(/\/$/, '') === '/hello',
		);
		expect(helloPath).toBeDefined();
	});

	it('serves the postman json endpoint', async () => {
		const response = await request(app.getApp()).get('/postman.json');
		expect(response.status).toBe(200);
		expect(response.body.info.name).toBe('App V2 Test');
	});

	it('resolves autoloaded injectables from the container', () => {
		const service = container.get<GreetingService>(GREETING_SERVICE);
		expect(service.greet('Mini')).toBe('Hello, Mini!');
	});

	it('rejects a second @Mini2App class', () => {
		const defineSecondApp = () => {
			@Mini2App()
			class SecondAppV2 extends Mini2AppClass {
				protected resolveConfig() {
					return {
						host: 'localhost',
						port: 3011,
						applicationName: 'Second App',
					};
				}
			}
			return SecondAppV2;
		};

		expect(defineSecondApp).toThrow(/Only one @Mini2App class is allowed/);
	});

	it('stop() closes the server cleanly', async () => {
		await app.stop();
		expect(app.server).toBeUndefined();
	});
});
