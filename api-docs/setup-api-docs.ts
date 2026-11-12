import { Express } from 'express';
import { IConfig } from '../interfaces/config.interface';
import { IController } from '../notations';
import { resolveDocsExposure } from '../utils/docs-exposure';
import { PostmanIntegration } from './postman';
import { SwaggerIntegration } from './swagger';

export function setupApiDocumentation(
	app: Express,
	config: IConfig,
	controllers: IController[],
): void {
	const exposure = resolveDocsExposure(config);
	if (!exposure.swagger && !exposure.postman) {
		return;
	}

	const servers = config.swaggerServers ?? [
		{
			url: `http://${config.host}:${config.port}`,
			description: 'Development server',
		},
	];

	const sharedOptions = {
		title: config.applicationName,
		description: `API documentation for ${config.applicationName}`,
		version: '1.0.0',
		servers,
		...(config.swaggerBasicAuth && { basicAuth: config.swaggerBasicAuth }),
	};

	if (exposure.swagger) {
		const swaggerIntegration = new SwaggerIntegration({
			...sharedOptions,
			docsPath: config.swaggerDocsPath ?? '/api-docs',
			jsonPath: config.swaggerJsonPath ?? '/api-docs.json',
		});
		swaggerIntegration.generateSwaggerSpec(controllers);
		swaggerIntegration.setupSwagger(app);
	}

	if (exposure.postman) {
		const postmanIntegration = new PostmanIntegration({
			...sharedOptions,
			jsonPath: config.postmanJsonPath ?? '/postman.json',
		});
		postmanIntegration.generatePostmanCollection(controllers);
		postmanIntegration.setupPostman(app);
	}
}
