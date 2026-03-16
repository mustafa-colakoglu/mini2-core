import 'reflect-metadata';
import swaggerUi from 'swagger-ui-express';
import { Express, Request, Response, NextFunction } from 'express';
import { keyOfPath, keyOfRouteOptions, RouteOptions } from './notations';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import { SwaggerOptions } from 'swagger-ui-express';
import { ISwaggerBasicAuth } from './interfaces/config.interface';
import { inferSchema } from './utils/infer-schema';

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
			const controllerPath = Reflect.getMetadata(
				keyOfPath,
				controller.constructor,
			);
			if (!controllerPath) {
				console.log(`❌ No path metadata found for ${controller.constructor.name}`);
				return;
			}

			const allProperties = Object.getOwnPropertyNames(
				Object.getPrototypeOf(controller),
			);

			allProperties.forEach((property) => {
				const routeOptions: RouteOptions = Reflect.getMetadata(
					keyOfRouteOptions,
					controller,
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

				// Add Postman scripts as vendor extensions
				if (routeOptions.preRequestScript) {
					operation['x-postman-prerequest'] = {
						script: {
							type: 'text/javascript',
							exec: routeOptions.preRequestScript.split('\n'),
						},
					};
				}
				
				if (routeOptions.testScript) {
					operation['x-postman-test'] = {
						script: {
							type: 'text/javascript',
							exec: routeOptions.testScript.split('\n'),
						},
					};
				}

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
					const example = routeOptions.examples[0];

					// Add request body from example
					if (example.request?.body) {
						const bodySchema = inferSchema(example.request.body);
						operation.requestBody = {
							required: true,
							content: {
								'application/json': {
									schema: bodySchema,
									example: example.request.body,
								},
							},
						};
					}

					// Initialize parameters array
					if (!operation.parameters) operation.parameters = [];

					// Add path parameters from example (if provided in example)
					if (example.request?.params && pathParams.length > 0) {
						const paramsSchema = inferSchema(example.request.params);
						pathParams.forEach((param) => {
							operation.parameters!.push({
								name: param,
								in: 'path',
								required: true,
								schema: paramsSchema.properties?.[param] || { type: 'string' },
								example: (example.request!.params as any)[param],
							});
						});
					}

					// Add query parameters from example
					if (example.request?.query) {
						const querySchema = inferSchema(example.request.query);
						
						// Add each query parameter separately
						if (querySchema.properties) {
							Object.keys(querySchema.properties).forEach((paramName) => {
								operation.parameters!.push({
									name: paramName,
									in: 'query',
									required: querySchema.required?.includes(paramName) ?? false,
									schema: querySchema.properties[paramName],
									example: (example.request!.query as any)[paramName],
								});
							});
						}
					}

					// Add header parameters from example
					if (example.request?.headers) {
						const headersSchema = inferSchema(example.request.headers);
						
						// Add each header separately
						if (headersSchema.properties) {
							Object.keys(headersSchema.properties).forEach((headerName) => {
								operation.parameters!.push({
									name: headerName,
									in: 'header',
									required: headersSchema.required?.includes(headerName) ?? false,
									schema: headersSchema.properties[headerName],
									example: (example.request!.headers as any)[headerName],
								});
							});
						}
					}
				} else {
					// Fallback to validations if no examples provided
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
				}

				// Add responses from examples
				if (routeOptions.examples && routeOptions.examples.length > 0) {
					const example = routeOptions.examples[0];
					operation.responses = {};

					const responses = example.response as Record<string, any>;
					Object.keys(responses).forEach((statusCode) => {
						const responseData = responses[statusCode];
						const responseSchema = inferSchema(responseData.data);
						
						operation.responses[statusCode] = {
							description: responseData.description,
							content: {
								[responseData.contentType || 'application/json']: {
									schema: responseSchema,
									example: responseData.data,
									examples: {
										default: {
											summary: responseData.description,
											value: responseData.data,
										},
									},
								},
							},
						};
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
