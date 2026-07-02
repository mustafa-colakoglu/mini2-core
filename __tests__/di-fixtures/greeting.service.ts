import { autoBind } from '../../container';

export const GREETING_SERVICE = Symbol.for('GreetingService');

@autoBind(GREETING_SERVICE)
export class GreetingService {
	greet(name: string): string {
		return `Hello, ${name}!`;
	}
}
