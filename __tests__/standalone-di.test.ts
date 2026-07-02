// __tests__/standalone-di.test.ts
import 'reflect-metadata';
import { container, setupInjectables } from '../index';
import {
	GREETING_SERVICE,
	GreetingService,
} from './di-fixtures/greeting.service';

describe('Standalone DI (setupInjectables)', () => {
	it('does nothing when autoload is not enabled', () => {
		expect(setupInjectables()).toEqual({ loaded: false });
		expect(setupInjectables({ autoload: false })).toEqual({ loaded: false });
	});

	it('loads injectables and binds them without an Express app', () => {
		const result = setupInjectables({
			autoload: true,
			workingDirectory: __dirname + '/di-fixtures',
			extensions: ['.ts'],
		});

		expect(result.loaded).toBe(true);
		expect(result.count).toBeGreaterThan(0);

		const service = container.get<GreetingService>(GREETING_SERVICE);
		expect(service).toBeInstanceOf(GreetingService);
		expect(service.greet('Mini')).toBe('Hello, Mini!');
	});
});
