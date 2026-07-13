import { container } from './container';
import { MINI_TYPES } from './types';
import { LoadInjectablesOptions, setupInjectables } from './loader';
import { getMini2AppRegistry, Mini2AppClass } from './Mini2App';

/**
 * AppV2 bootstrap fonksiyonu. loadInjectablesOptions verilirse önce
 * setupInjectables çalıştırır; verilmezse setup atlanır (setupInjectables'ın
 * daha önce çağrıldığı varsayılır). Ardından @Mini2App ile kayıtlı class'ı
 * container'dan alıp başlatır.
 */
export async function startMini2App(
	loadInjectablesOptions?: LoadInjectablesOptions
): Promise<Mini2AppClass> {
	if (loadInjectablesOptions !== undefined) {
		setupInjectables(loadInjectablesOptions);
	}

	const registry = getMini2AppRegistry();
	if (registry.length === 0) {
		throw new Error(
			'No @Mini2App decorated class found. Decorate a class extending Mini2AppClass with @Mini2App(), override resolveConfig(), and make sure its file is imported or autoloaded.'
		);
	}

	const instance = container.get<Mini2AppClass>(MINI_TYPES.IAppV2);
	await instance.start();
	return instance;
}
