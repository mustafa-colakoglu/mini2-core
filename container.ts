import type { ServiceIdentifier } from 'inversify';
import { Container } from 'inversify';
export const container = new Container({
	defaultScope: 'Singleton',
	autobind: true,
});

type Scope = 'Singleton' | 'Transient' | 'Request';

export type DiscoveredBinding = {
	token: ServiceIdentifier<any>;
	target: new (...args: any[]) => any;
	scope: Scope;
};

const DISCOVERY_KEY = Symbol.for('DI_DISCOVERY_REGISTRY');

function getRegistry(): DiscoveredBinding[] {
	const g = globalThis as any;
	if (!g[DISCOVERY_KEY]) g[DISCOVERY_KEY] = [];
	return g[DISCOVERY_KEY] as DiscoveredBinding[];
}

export function AutoBind(
	token: DiscoveredBinding['token'],
	opts?: { scope?: Scope }
) {
	const scope = opts?.scope ?? 'Singleton';

	return function (target: any) {
		const reg = getRegistry();
		reg.push({ token, target, scope });
	};
}

export const bindDiscovered = () => {
	const reg = getRegistry();
	for (const b of reg) {
		if (container.isBound(b.token) && b.scope === 'Singleton') continue;

		const binding = container.bind(b.token).to(b.target);

		if (b.scope === 'Singleton') binding.inSingletonScope();
		if (b.scope === 'Transient') binding.inTransientScope();
		if (b.scope === 'Request') binding.inRequestScope();
	}

	return { count: reg.length };
};
