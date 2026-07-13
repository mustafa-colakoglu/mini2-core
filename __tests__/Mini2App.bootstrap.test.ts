// __tests__/Mini2App.bootstrap.test.ts
// setupInjectables ayrı çağrıldıktan sonra startMini2App() loadOptions olmadan başlatır.
import 'reflect-metadata';
import request from 'supertest';
import {
	Mini2App,
	Mini2AppClass,
	setupInjectables,
	startMini2App,
} from '../index';

const TEST_PORT = 3013;

@Mini2App()
class BootstrapApp extends Mini2AppClass {
	protected resolveConfig() {
		return {
			host: 'localhost',
			port: TEST_PORT,
			applicationName: 'Bootstrap App',
		};
	}
}

describe('Mini2App separate bootstrap (setupInjectables + startMini2App)', () => {
	let app: Mini2AppClass;

	beforeAll(async () => {
		setupInjectables({
			autoload: true,
			workingDirectory: __dirname + '/di-fixtures',
			extensions: ['.ts'],
			logging: false,
		});

		app = await startMini2App();
	});

	afterAll(async () => {
		await app.stop();
	});

	it('starts without passing loadOptions to startMini2App', () => {
		expect(app).toBeInstanceOf(BootstrapApp);
		expect(app.server).toBeDefined();
		expect(app.config.applicationName).toBe('Bootstrap App');
	});

	it('serves autoloaded controller routes', async () => {
		const response = await request(app.getApp()).get('/hello');
		expect(response.status).toBe(200);
		expect(response.body).toEqual({ message: 'hello from v2' });
	});
});
