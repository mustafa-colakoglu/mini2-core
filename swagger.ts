import 'reflect-metadata';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { keyOfPath, keyOfRouteOptions, RouteOptions } from './rest';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';

export interface SwaggerOptions {
	title?: string;
	description?: string;
	version?: string;
	servers?: { url: string; description?: string }[];
	docsPath?: string;
	jsonPath?: string;
	components?: any;
}

export class SwaggerIntegration {
	private swaggerSpec: any;
	private options: SwaggerOptions;

	constructor(options: SwaggerOptions = {}) {
		this.options = {
			title: 'Mini Framework API',
			description: 'API documentation for Mini Framework',
			version: '1.0.0',
			servers: [
				{ url: 'http://localhost:3000', description: 'Development server' },
			],
			docsPath: '/api-docs',
			jsonPath: '/api-docs.json',
			...options,
		};
	}

	public generateSwaggerSpec(controllers: any[]) {
		const paths: any = {};
		const components: any = {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer',
					bearerFormat: 'JWT',
				},
			},
			schemas: validationMetadatasToSchemas(),
		};

		controllers.forEach((controller) => {
			const controllerPath = Reflect.getMetadata(
				keyOfPath,
				controller.constructor
			);
			if (!controllerPath) {
				console.log(`❌ No path metadata found for ${controller.constructor.name}`);
				return;
			}

			const allProperties = Object.getOwnPropertyNames(
				Object.getPrototypeOf(controller)
			);

			allProperties.forEach((property) => {
				const routeOptions: RouteOptions = Reflect.getMetadata(
					keyOfRouteOptions,
					controller,
					property
				);

				if (!routeOptions || !routeOptions.path || !routeOptions.method) {
					if (property !== 'constructor') {
						console.log(`⚠️ Skipping ${property} - no valid route options`);
					}
					return;
				}

				const fullPath = controllerPath + routeOptions.path;
				const method = routeOptions.method.toLowerCase();
				if (!paths[fullPath]) {
					paths[fullPath] = {};
				}

				// Generate OpenAPI operation
				const operation: any = {
					summary: this.generateSummary(method, fullPath),
					description: this.generateDescription(method, fullPath),
					tags: [this.extractControllerTag(controllerPath)],
					responses: {
						'200': {
							description: 'Success',
							content: {
								'application/json': {
									schema: {
										type: 'object',
									},
								},
							},
						},
					},
				};

				// Add parameters from path
				const pathParams = this.extractPathParameters(routeOptions.path);
				if (pathParams.length > 0) {
					operation.parameters = pathParams.map((param) => ({
						name: param,
						in: 'path',
						required: true,
						schema: {
							type: 'string',
						},
					}));
				}

				// Add request body for POST/PUT/PATCH
				if (['post', 'put', 'patch'].includes(method) && routeOptions.validations) {
					const bodyValidation = routeOptions.validations?.find((v) => v.body);
					if (bodyValidation) {
						operation.requestBody = {
							required: true,
							content: {
								'application/json': {
									schema: this.generateSchemaFromValidation(bodyValidation.body),
								},
							},
						};
					}
				}

				// Add security if authenticated
				if (routeOptions.authenticated) {
					operation.security = [{ bearerAuth: [] }];
				}

				// Add error responses
				if (routeOptions.authenticated) {
					operation.responses['401'] = {
						description: 'Unauthorized',
					};
				}

				if (routeOptions.permissions && routeOptions.permissions.length > 0) {
					operation.responses['403'] = {
						description: 'Forbidden',
					};
				}

				operation.responses['400'] = {
					description: 'Bad Request',
				};

				paths[fullPath][method] = operation;
			});
		});
		this.swaggerSpec = {
			openapi: '3.0.0',
			info: {
				title: this.options.title!,
				description: this.options.description!,
				version: this.options.version!,
				contact: {
					name: 'API Support',
					email: 'support@example.com',
				},
			},
			servers: this.options.servers,
			paths,
			components,
		};
	}

	private generateSummary(method: string, path: string): string {
		const action = method.toUpperCase();
		const resource = this.extractResourceName(path);

		const actionMap: { [key: string]: string } = {
			GET: path.includes('/:') ? `Get ${resource} by ID` : `Get all ${resource}`,
			POST: `Create ${resource}`,
			PUT: `Update ${resource}`,
			PATCH: `Partially update ${resource}`,
			DELETE: `Delete ${resource}`,
		};

		return actionMap[action] || `${action} ${resource}`;
	}

	private generateDescription(method: string, path: string): string {
		const action = method.toLowerCase();
		const resource = this.extractResourceName(path);

		const descriptions: { [key: string]: string } = {
			get: path.includes('/:')
				? `Retrieve a specific ${resource} by its ID`
				: `Retrieve all ${resource} records`,
			post: `Create a new ${resource} record`,
			put: `Update an existing ${resource} record`,
			patch: `Partially update an existing ${resource} record`,
			delete: `Delete a ${resource} record`,
		};

		return descriptions[action] || `${action} operation on ${resource}`;
	}

	private extractControllerTag(controllerPath: string): string {
		const segments = controllerPath.split('/').filter(Boolean);
		const lastSegment = segments[segments.length - 1];
		return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);
	}

	private extractResourceName(path: string): string {
		const segments = path.split('/').filter(Boolean);
		let resource = segments[segments.length - 1];

		// Remove path parameters (e.g., :id)
		if (resource.startsWith(':')) {
			resource = segments[segments.length - 2] || 'Resource';
		}

		return resource.charAt(0).toUpperCase() + resource.slice(1);
	}

	private extractPathParameters(path: string): string[] {
		const matches = path.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
		return matches ? matches.map((match) => match.substring(1)) : [];
	}

	private generateSchemaFromValidation(validationClass: any): any {
		const className = validationClass.name;
		return { $ref: `#/components/schemas/${className}` };
	}

	public setupSwagger(app: Express) {
		// Swagger UI middleware
		app.use(
			this.options.docsPath!,
			swaggerUi.serve,
			swaggerUi.setup(this.swaggerSpec, {
				explorer: true,
				customCss: '.swagger-ui .topbar { display: none }',
				customSiteTitle: this.options.title,
				swaggerOptions: {
					docExpansion: 'list',
					filter: true,
					showRequestHeaders: true,
					tryItOutEnabled: true,
					persistAuthorization: true,
				},
			})
		);

		// JSON endpoint for OpenAPI spec
		app.get(this.options.jsonPath!, (_req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.send(this.swaggerSpec);
		});

		console.log(`📚 Swagger UI available at: ${this.options.docsPath}`);
		console.log(`📄 OpenAPI JSON spec available at: ${this.options.jsonPath}`);
	}

	public getSwaggerSpec() {
		return this.swaggerSpec;
	}
}

export default SwaggerIntegration;
