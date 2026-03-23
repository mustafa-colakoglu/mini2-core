import 'reflect-metadata';
import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response, NextFunction } from 'express';
import { keyOfPath, keyOfRouteOptions, RouteOptions } from '../notations';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import { SwaggerOptions } from 'swagger-ui-express';
import { ISwaggerBasicAuth } from '../interfaces/config.interface';
import { inferSchema } from '../utils/infer-schema';

export interface ISwaggerIntegrationOptions extends SwaggerOptions {
	basicAuth?: ISwaggerBasicAuth;
}

export class SwaggerIntegration {
	private swaggerSpec: any;
	private options: ISwaggerIntegrationOptions;

	constructor(options: ISwaggerIntegrationOptions = {}) {
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
			const controllerPrototype = Object.getPrototypeOf(controller);
			const controllerPath = Reflect.getMetadata(
				keyOfPath,
				controller.constructor,
			);
			if (!controllerPath) {
				console.log(`❌ No path metadata found for ${controller.constructor.name}`);
				return;
			}

			const controllerTag = this.extractControllerTag(controllerPath);

			const allProperties = Object.getOwnPropertyNames(controllerPrototype);

			allProperties.forEach((property) => {
				const routeOptions: RouteOptions = Reflect.getMetadata(
					keyOfRouteOptions,
					controllerPrototype,
					property,
				);

				if (!routeOptions || !routeOptions.path || !routeOptions.method) {
					if (property !== 'constructor') {
						console.log(`⚠️ Skipping ${property} - no valid route options`);
					}
					return;
				}

				const fullPath =
					controllerPath.replace(/\/$/, '') +
					routeOptions.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

				const method = routeOptions.method.toLowerCase();
				if (!paths[fullPath]) {
					paths[fullPath] = {};
				}

				// Generate OpenAPI operation
				const operation: any = {
					summary:
						routeOptions.name?.trim() || this.generateSummary(method, fullPath),
					description: this.generateDescription(method, fullPath),
					tags: [controllerTag],
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

				// Check if examples are provided
				if (routeOptions.examples && routeOptions.examples.length > 0) {
					const examples = routeOptions.examples;
					const firstBodyExample = examples.find((example) => example.request?.body);

					// Add request body from examples
					if (firstBodyExample?.request?.body) {
						const bodySchema = inferSchema(firstBodyExample.request.body);
						const bodyExamples = examples
							.filter((example) => example.request?.body !== undefined)
							.reduce(
								(acc, example, index) => {
									acc[`example_${index + 1}`] = {
										summary: `Example ${index + 1}`,
										value: example.request!.body,
									};
									return acc;
								},
								{} as Record<string, { summary: string; value: unknown }>,
							);

						operation.requestBody = {
							required: true,
							content: {
								'application/json': {
									schema: bodySchema,
									example: firstBodyExample.request.body,
									examples: bodyExamples,
								},
							},
						};
					}

					// Initialize parameters array
					if (!operation.parameters) operation.parameters = [];

					const pathParamIndex = new Map<string, any>();
					const queryParamIndex = new Map<string, any>();
					const headerParamIndex = new Map<string, any>();

					examples.forEach((example, exampleIndex) => {
						if (example.request?.params && pathParams.length > 0) {
							const paramsSchema = inferSchema(example.request.params);
							pathParams.forEach((param) => {
								const key = `path:${param}`;
								let parameter = pathParamIndex.get(key);
								if (!parameter) {
									parameter = {
										name: param,
										in: 'path',
										required: true,
										schema: paramsSchema.properties?.[param] || { type: 'string' },
										example: (example.request!.params as any)[param],
										examples: {},
									};
									pathParamIndex.set(key, parameter);
									operation.parameters!.push(parameter);
								}
								parameter.examples[`example_${exampleIndex + 1}`] = {
									value: (example.request!.params as any)[param],
								};
							});
						}

						if (example.request?.query) {
							const querySchema = inferSchema(example.request.query);
							if (querySchema.properties) {
								Object.keys(querySchema.properties).forEach((paramName) => {
									const key = `query:${paramName}`;
									let parameter = queryParamIndex.get(key);
									if (!parameter) {
										parameter = {
											name: paramName,
											in: 'query',
											required: querySchema.required?.includes(paramName) ?? false,
											schema: querySchema.properties[paramName],
											example: (example.request!.query as any)[paramName],
											examples: {},
										};
										queryParamIndex.set(key, parameter);
										operation.parameters!.push(parameter);
									}
									parameter.examples[`example_${exampleIndex + 1}`] = {
										value: (example.request!.query as any)[paramName],
									};
								});
							}
						}

						if (example.request?.headers) {
							const headersSchema = inferSchema(example.request.headers);
							if (headersSchema.properties) {
								Object.keys(headersSchema.properties).forEach((headerName) => {
									const key = `header:${headerName}`;
									let parameter = headerParamIndex.get(key);
									if (!parameter) {
										parameter = {
											name: headerName,
											in: 'header',
											required: headersSchema.required?.includes(headerName) ?? false,
											schema: headersSchema.properties[headerName],
											example: (example.request!.headers as any)[headerName],
											examples: {},
										};
										headerParamIndex.set(key, parameter);
										operation.parameters!.push(parameter);
									}
									parameter.examples[`example_${exampleIndex + 1}`] = {
										value: (example.request!.headers as any)[headerName],
									};
								});
							}
						}
					});
				} else {
					// Fallback to validations if no examples provided
					if (
						['post', 'put', 'patch'].includes(method) &&
						routeOptions.validations
					) {
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
				}

				// Add responses from examples
				if (routeOptions.examples && routeOptions.examples.length > 0) {
					operation.responses = {};

					routeOptions.examples.forEach((example, exampleIndex) => {
						Object.entries(example.response as Record<string, unknown>).forEach(
							([statusCode, responseData]) => {
								const rawResponse = responseData as Record<string, any>;
								const hasLegacyShape =
									rawResponse &&
									typeof rawResponse === 'object' &&
									'description' in rawResponse &&
									'data' in rawResponse;
								const contentType = hasLegacyShape
									? rawResponse.contentType || 'application/json'
									: 'application/json';
								const responseDescription = hasLegacyShape
									? rawResponse.description
									: `Status ${statusCode}`;
								const responseValue = hasLegacyShape
									? rawResponse.data
									: responseData;
								const responseSchema = inferSchema(responseValue);

								if (!operation.responses[statusCode]) {
									operation.responses[statusCode] = {
										description: responseDescription,
										content: {
											[contentType]: {
												schema: responseSchema,
												example: responseValue,
												examples: {},
											},
										},
									};
								}

								operation.responses[statusCode].content[contentType].examples[
									`example_${exampleIndex + 1}`
								] = {
									summary: `Example ${exampleIndex + 1}`,
									value: responseValue,
								};

								if (
									!operation.responses[statusCode].content[contentType].examples
										.default
								) {
									operation.responses[statusCode].content[contentType].examples.default =
										{
											summary: responseDescription,
											value: responseValue,
										};
								}
							},
						);
					});
				} else {
					// Fallback to default responses if no examples
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
				}

				// Postman-compatible script vendor extensions
				const postmanEvents: any[] = [];
				if (routeOptions.preRequestScript) {
					const script = this.toPostmanScript(routeOptions.preRequestScript);
					operation['x-postman-prerequest'] = { script };
					postmanEvents.push({ listen: 'prerequest', script });
				}
				if (routeOptions.testScript) {
					const script = this.toPostmanScript(routeOptions.testScript);
					operation['x-postman-test'] = { script };
					postmanEvents.push({ listen: 'test', script });
				}
				if (postmanEvents.length > 0) {
					operation['x-postman-events'] = postmanEvents;
				}

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
		const hasPathParam = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(path);

		const actionMap: { [key: string]: string } = {
			GET: hasPathParam ? `Get ${resource} by ID` : `Get all ${resource}`,
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
		const hasPathParam = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(path);

		const descriptions: { [key: string]: string } = {
			get: hasPathParam
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

		// Remove path parameters (e.g., :id or {id})
		if (resource.startsWith(':') || resource.startsWith('{')) {
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

	private toPostmanScript(scriptContent: string) {
		const exec = scriptContent
			.split('\n')
			.map((line) => line.trimEnd())
			.filter((line) => line.trim().length > 0);
		return {
			type: 'text/javascript',
			exec,
		};
	}

	private basicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
		const auth = req.headers.authorization;

		if (!auth || !auth.startsWith('Basic ')) {
			res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
			res.status(401).send('Authentication required');
			return;
		}

		const credentials = Buffer.from(auth.substring(6), 'base64').toString();
		const [username, password] = credentials.split(':');

		if (
			username === this.options.basicAuth?.username &&
			password === this.options.basicAuth?.password
		) {
			next();
		} else {
			res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
			res.status(401).send('Invalid credentials');
		}
	}

	public setupSwagger(app: Express) {
		const authMiddleware = this.options.basicAuth
			? this.basicAuthMiddleware.bind(this)
			: (_req: Request, _res: Response, next: NextFunction) => next();

		// Swagger UI middleware with optional basic auth
		app.use(
			this.options.docsPath!,
			authMiddleware,
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
			}),
		);

		// JSON endpoint for OpenAPI spec with optional basic auth
		app.get(this.options.jsonPath!, authMiddleware, (_req, res) => {
			res.setHeader('Content-Type', 'application/json');
			res.send(this.swaggerSpec);
		});

		console.log(`📚 Swagger UI available at: ${this.options.docsPath}`);
		console.log(`📄 OpenAPI JSON spec available at: ${this.options.jsonPath}`);
		if (this.options.basicAuth) {
			console.log(`🔒 Swagger endpoints protected with Basic Authentication`);
		}
	}

	public getSwaggerSpec() {
		return this.swaggerSpec;
	}
}

export default SwaggerIntegration;
