import 'reflect-metadata';
import { Express, NextFunction, Request, Response } from 'express';
import { ISwaggerBasicAuth } from '../interfaces/config.interface';
import {
	IRequestResponseExample,
	keyOfPath,
	keyOfRouteOptions,
	RouteOptions,
} from '../notations';

type PostmanScript = {
	type: 'text/javascript';
	exec: string[];
};

type PostmanEvent = {
	listen: 'prerequest' | 'test';
	script: PostmanScript;
};

type PostmanHeader = {
	key: string;
	value: string;
};

type PostmanQuery = {
	key: string;
	value: string;
};

type PostmanVariable = {
	key: string;
	value: string;
};

type PostmanUrl = {
	raw: string;
	host: string[];
	path: string[];
	query?: PostmanQuery[];
	variable?: PostmanVariable[];
};

type PostmanRequest = {
	method: string;
	header: PostmanHeader[];
	url: PostmanUrl;
	description?: string;
	body?: {
		mode: 'raw';
		raw: string;
		options: {
			raw: {
				language: 'json';
				examples?: unknown[];
			};
		};
	};
};

type PostmanResponse = {
	name: string;
	originalRequest: PostmanRequest;
	status: string;
	code: number;
	_postman_previewlanguage: 'json' | 'text';
	header: PostmanHeader[];
	cookie: unknown[];
	body: string;
};

type PostmanRequestItem = {
	name: string;
	event?: PostmanEvent[];
	request: PostmanRequest;
	response: PostmanResponse[];
};

type PostmanFolderItem = {
	name: string;
	item: PostmanRequestItem[];
};

type PostmanCollection = {
	info: {
		_postman_id: string;
		name: string;
		description: string;
		schema: string;
	};
	item: PostmanFolderItem[];
	variable: Array<{ key: string; value: string }>;
};

export interface IPostmanIntegrationOptions {
	title?: string;
	description?: string;
	version?: string;
	servers?: Array<{ url: string; description: string }>;
	jsonPath?: string;
	basicAuth?: ISwaggerBasicAuth;
	baseUrlVariableName?: string;
}

export class PostmanIntegration {
	private postmanCollection: PostmanCollection | null = null;
	private options: IPostmanIntegrationOptions;

	constructor(options: IPostmanIntegrationOptions = {}) {
		this.options = {
			title: 'Mini Framework API',
			description: 'API documentation for Mini Framework',
			version: '1.0.0',
			servers: [
				{ url: 'http://localhost:3000', description: 'Development server' },
			],
			jsonPath: '/postman.json',
			baseUrlVariableName: 'baseUrl',
			...options,
		};
	}

	public generatePostmanCollection(controllers: any[]) {
		const folders = new Map<string, PostmanRequestItem[]>();
		const defaultBaseUrl = this.getDefaultBaseUrl();
		const baseUrlVariableName = this.options.baseUrlVariableName || 'baseUrl';

		controllers.forEach((controller) => {
			const controllerPrototype = Object.getPrototypeOf(controller);
			const controllerPath = Reflect.getMetadata(
				keyOfPath,
				controller.constructor,
			) as string | undefined;
			if (!controllerPath) return;

			const folderName = this.extractControllerFolderName(controllerPath);
			const allProperties = Object.getOwnPropertyNames(controllerPrototype);

			allProperties.forEach((property) => {
				const routeOptions = Reflect.getMetadata(
					keyOfRouteOptions,
					controllerPrototype,
					property,
				) as RouteOptions | undefined;

				if (!routeOptions?.path || !routeOptions.method) return;

				const fullPath =
					controllerPath.replace(/\/$/, '') +
					routeOptions.path.replace(/:([a-zA-Z0-9_]+)/g, '{{$1}}');
				const method = routeOptions.method.toUpperCase();

				const requestItem = this.buildRequestItem(
					method,
					fullPath,
					routeOptions,
					baseUrlVariableName,
				);

				if (!folders.has(folderName)) {
					folders.set(folderName, []);
				}
				folders.get(folderName)!.push(requestItem);
			});
		});

		this.postmanCollection = {
			info: {
				_postman_id: this.generateCollectionId(),
				name: this.options.title || 'Mini Framework API',
				description: this.buildCollectionDescription(),
				schema:
					'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
			},
			item: Array.from(folders.entries()).map(([name, item]) => ({ name, item })),
			variable: [{ key: baseUrlVariableName, value: defaultBaseUrl }],
		};
	}

	public setupPostman(app: Express) {
		const authMiddleware = this.options.basicAuth
			? this.basicAuthMiddleware.bind(this)
			: (_req: Request, _res: Response, next: NextFunction) => next();

		app.get(this.options.jsonPath!, authMiddleware, (_req, res) => {
			if (!this.postmanCollection) {
				res.status(500).json({
					error: 'Postman collection has not been generated yet.',
				});
				return;
			}

			res.setHeader('Content-Type', 'application/json');
			res.send(this.postmanCollection);
		});
	}

	public getPostmanCollection() {
		return this.postmanCollection;
	}

	private buildRequestItem(
		method: string,
		fullPath: string,
		routeOptions: RouteOptions,
		baseUrlVariableName: string,
	): PostmanRequestItem {
		const examples = routeOptions.examples ?? [];
		const events = this.buildEvents(routeOptions);
		const baseRequestName =
			routeOptions.name?.trim() ||
			this.generateSummary(method.toLowerCase(), fullPath);
		const primaryExample = examples[0];
		const request = this.buildRequest(
			method,
			fullPath,
			baseUrlVariableName,
			routeOptions,
			primaryExample,
			examples,
		);

		return {
			name: baseRequestName,
			...(events ? { event: events } : {}),
			request,
			response: this.buildResponses(method, request, routeOptions, examples),
		};
	}

	private buildRequest(
		method: string,
		fullPath: string,
		baseUrlVariableName: string,
		routeOptions: RouteOptions,
		example: IRequestResponseExample | undefined,
		examples: IRequestResponseExample[],
	): PostmanRequest {
		const headers: PostmanHeader[] = [
			{ key: 'Content-Type', value: 'application/json' },
			{ key: 'Accept', value: 'application/json' },
		];

		if (example?.request?.headers && this.isRecord(example.request.headers)) {
			Object.entries(example.request.headers).forEach(([key, value]) => {
				headers.push({ key, value: this.stringifyScalar(value) });
			});
		}

		const query = this.buildQuery(example?.request?.query);
		const variable = this.buildPathVariables(fullPath, example?.request?.params);
		const path = this.extractPostmanPath(fullPath);
		const rawUrl = `{{${baseUrlVariableName}}}${fullPath}`;

		const request: PostmanRequest = {
			method,
			header: headers,
			url: {
				raw: rawUrl,
				host: [`{{${baseUrlVariableName}}}`],
				path,
				...(query.length ? { query } : {}),
				...(variable.length ? { variable } : {}),
			},
			description: this.generateDescription(method.toLowerCase(), fullPath),
		};

		const bodyPayload = example?.request?.body;
		if (bodyPayload) {
			const bodyExamples = this.extractBodyExamples(examples);

			request.body = {
				mode: 'raw',
				raw: JSON.stringify(bodyPayload, null, 2),
				options: {
					raw: {
						language: 'json',
						...(bodyExamples.length ? { examples: bodyExamples } : {}),
					},
				},
			};
		} else if (
			['POST', 'PUT', 'PATCH'].includes(method) &&
			(routeOptions.validations?.some((validation) => validation.body) ?? false)
		) {
			// Swagger tarafindaki body-validation fallback'ina paralel olarak
			// body bolumunu en azindan bos bir JSON payload ile gorunur kil.
			request.body = {
				mode: 'raw',
				raw: JSON.stringify({}, null, 2),
				options: {
					raw: {
						language: 'json',
					},
				},
			};
		}

		return request;
	}

	private extractBodyExamples(examples: IRequestResponseExample[]): unknown[] {
		return examples
			.map((item) => item.request?.body)
			.filter((body): body is unknown => body !== undefined)
			.map((body) => JSON.parse(JSON.stringify(body)));
	}

	private buildResponses(
		method: string,
		request: PostmanRequest,
		routeOptions: RouteOptions,
		examples: IRequestResponseExample[],
	): PostmanResponse[] {
		const responses: PostmanResponse[] = [];

		if (examples.length > 0) {
			examples.forEach((example, exampleIndex) => {
				const response = example.response as Record<string, unknown> | undefined;
				if (!response || typeof response !== 'object') return;

				Object.entries(response).forEach(([statusCode, responseData]) => {
					const code = Number(statusCode);
					const body =
						typeof responseData === 'string'
							? responseData
							: JSON.stringify(responseData, null, 2);

					responses.push({
						name:
							examples.length > 1
								? `Status ${statusCode} (Example ${exampleIndex + 1})`
								: `Status ${statusCode}`,
						originalRequest: request,
						status: `Status ${statusCode}`,
						code: Number.isNaN(code) ? 200 : code,
						_postman_previewlanguage: 'json',
						header: [
							{
								key: 'Content-Type',
								value: 'application/json',
							},
						],
						cookie: [],
						body,
					});
				});
			});
			return responses;
		}

		const defaultCode = this.defaultStatusForMethod(method);
		responses.push(
			this.createDefaultResponse(defaultCode, 'Success', { ok: true }, request),
		);
		responses.push(
			this.createDefaultResponse(
				400,
				'Bad Request',
				{ message: 'Bad Request' },
				request,
			),
		);
		if (routeOptions.permissions && routeOptions.permissions.length > 0) {
			responses.push(
				this.createDefaultResponse(
					403,
					'Forbidden',
					{ message: 'Forbidden' },
					request,
				),
			);
		}
		return responses;
	}

	private createDefaultResponse(
		code: number,
		name: string,
		payload: unknown,
		request: PostmanRequest,
	): PostmanResponse {
		return {
			name,
			originalRequest: request,
			status: name,
			code,
			_postman_previewlanguage: 'json',
			header: [{ key: 'Content-Type', value: 'application/json' }],
			cookie: [],
			body: JSON.stringify(payload, null, 2),
		};
	}

	private buildEvents(routeOptions: RouteOptions): PostmanEvent[] | undefined {
		const events: PostmanEvent[] = [];

		if (routeOptions.preRequestScript) {
			events.push({
				listen: 'prerequest',
				script: this.toPostmanScript(routeOptions.preRequestScript),
			});
		}

		if (routeOptions.testScript) {
			events.push({
				listen: 'test',
				script: this.toPostmanScript(routeOptions.testScript),
			});
		}

		return events.length ? events : undefined;
	}

	private toPostmanScript(scriptContent: string): PostmanScript {
		const exec = scriptContent
			.split('\n')
			.map((line) => line.trimEnd())
			.filter((line) => line.trim().length > 0);
		return { type: 'text/javascript', exec };
	}

	private buildQuery(value: unknown): PostmanQuery[] {
		if (!this.isRecord(value)) return [];
		return Object.entries(value).map(([key, item]) => ({
			key,
			value: this.stringifyScalar(item),
		}));
	}

	private buildPathVariables(path: string, params: unknown): PostmanVariable[] {
		const names = this.extractPathVariables(path);
		if (!names.length) return [];

		const paramsRecord = this.isRecord(params) ? params : {};
		return names.map((name) => ({
			key: name,
			value: this.stringifyScalar(paramsRecord[name]),
		}));
	}

	private extractPathVariables(path: string): string[] {
		const matches = path.match(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g);
		return matches ? matches.map((entry) => entry.replace(/\{\{|\}\}/g, '')) : [];
	}

	private extractPostmanPath(fullPath: string): string[] {
		return fullPath
			.split('/')
			.filter((segment) => segment.length > 0)
			.map((segment) =>
				segment.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, ':$1'),
			);
	}

	private defaultStatusForMethod(method: string): number {
		if (method.toUpperCase() === 'POST') return 201;
		return 200;
	}

	private stringifyScalar(value: unknown): string {
		if (value === undefined || value === null) return '';
		if (typeof value === 'string') return value;
		if (typeof value === 'number' || typeof value === 'boolean') {
			return String(value);
		}
		return JSON.stringify(value);
	}

	private isRecord(value: unknown): value is Record<string, unknown> {
		return (
			value !== null &&
			typeof value === 'object' &&
			Object.getPrototypeOf(value) === Object.prototype
		);
	}

	private generateSummary(method: string, path: string): string {
		const action = method.toUpperCase();
		const resource = this.extractResourceName(path);
		const hasPathParam = path.includes('{{');

		const actionMap: Record<string, string> = {
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
		const hasPathParam = path.includes('{{');

		const descriptions: Record<string, string> = {
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

	private extractControllerFolderName(controllerPath: string): string {
		const cleaned = controllerPath.replace(/^\//, '').replace(/\/$/, '');
		return cleaned || 'root';
	}

	private extractResourceName(path: string): string {
		const segments = path.split('/').filter(Boolean);
		let resource = segments[segments.length - 1] || 'Resource';

		if (resource.startsWith('{{')) {
			resource = segments[segments.length - 2] || 'Resource';
		}

		return resource.charAt(0).toUpperCase() + resource.slice(1);
	}

	private getDefaultBaseUrl(): string {
		const serverUrl = this.options.servers?.[0]?.url;
		if (!serverUrl) return 'http://localhost:3000';
		return serverUrl.replace(/\/$/, '');
	}

	private buildCollectionDescription(): string {
		return [
			this.options.description || 'API documentation for Mini Framework',
			'',
			'Contact Support:',
			' Name: API Support',
			' Email: support@example.com',
		].join('\n');
	}

	private generateCollectionId(): string {
		if (
			typeof crypto !== 'undefined' &&
			typeof crypto.randomUUID === 'function'
		) {
			return crypto.randomUUID();
		}
		return `mini-postman-${Date.now()}`;
	}

	private basicAuthMiddleware(req: Request, res: Response, next: NextFunction) {
		const auth = req.headers.authorization;

		if (!auth || !auth.startsWith('Basic ')) {
			res.setHeader('WWW-Authenticate', 'Basic realm="Postman Documentation"');
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
			res.setHeader('WWW-Authenticate', 'Basic realm="Postman Documentation"');
			res.status(401).send('Invalid credentials');
		}
	}
}

export default PostmanIntegration;
