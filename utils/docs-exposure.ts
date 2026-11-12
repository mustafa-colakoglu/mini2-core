import { IConfig } from '../interfaces/config.interface';

export type DocsExposure = {
	swagger: boolean;
	postman: boolean;
};

const LEGACY_DOCS_WARNING =
	'[mini2] API documentation endpoints are enabled because legacy config fields ' +
	'(swaggerDocsPath, swaggerJsonPath, postmanJsonPath, or swaggerBasicAuth) are set. ' +
	'Prefer docs: { enabled: true } in a future release; implicit enablement may be removed.';

let legacyDocsWarningShown = false;

function warnLegacyDocsOnce(): void {
	if (legacyDocsWarningShown) return;
	legacyDocsWarningShown = true;
	console.warn(LEGACY_DOCS_WARNING);
}

function hasLegacyDocsFields(config: IConfig): boolean {
	return (
		config.swaggerDocsPath !== undefined ||
		config.swaggerJsonPath !== undefined ||
		config.postmanJsonPath !== undefined ||
		config.swaggerBasicAuth !== undefined
	);
}

/**
 * Determines whether Swagger UI/JSON and Postman collection endpoints are registered.
 * Default: disabled unless docs.enabled === true or legacy path/auth fields are set.
 */
export function resolveDocsExposure(config: IConfig): DocsExposure {
	const docs = config.docs;

	if (docs?.enabled === true) {
		const swagger = docs.swaggerEnabled !== false;
		const postman = docs.postmanEnabled !== false;
		return { swagger, postman };
	}

	if (docs?.enabled === false && !hasLegacyDocsFields(config)) {
		return { swagger: false, postman: false };
	}

	if (hasLegacyDocsFields(config)) {
		warnLegacyDocsOnce();
		return { swagger: true, postman: true };
	}

	if (docs?.enabled === false) {
		return { swagger: false, postman: false };
	}

	return { swagger: false, postman: false };
}
