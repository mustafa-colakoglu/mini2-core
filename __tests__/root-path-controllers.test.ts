// __tests__/root-path-controllers.test.ts
import 'reflect-metadata';
import express, { Express, Response } from 'express';
import request from 'supertest';
import { buildApp, controller, Controller, get, res } from '../notations';
import { SwaggerIntegration } from '../api-docs/swagger';
import { PostmanIntegration } from '../api-docs/postman';

@controller('/')
class RootSlashController extends Controller {
	constructor() {
		super();
	}

	@get('/health', 'Root Health Check')
	public health(@res() response: Response): void {
		response.json({ status: 'ok', source: 'root-slash' });
	}
}

@controller('')
class EmptyPathController extends Controller {
	constructor() {
		super();
	}

	@get('/ping', 'Empty Path Ping')
	public ping(@res() response: Response): void {
		response.json({ status: 'ok', source: 'empty-path' });
	}
}

describe('Root ("/") and empty ("") controller paths', () => {
	const controllers = [new RootSlashController(), new EmptyPathController()];

	describe('Swagger spec generation', () => {
		const swaggerIntegration = new SwaggerIntegration({
			title: 'Root Path Test API',
		});

		beforeAll(() => {
			swaggerIntegration.generateSwaggerSpec(controllers);
		});

		it('generates a spec without crashing', () => {
			const spec = swaggerIntegration.getSwaggerSpec();
			expect(spec).toBeDefined();
			expect(spec.openapi).toBe('3.0.0');
		});

		it('includes routes from the "/" controller', () => {
			const spec = swaggerIntegration.getSwaggerSpec();
			expect(spec.paths['/health']).toBeDefined();
			expect(spec.paths['/health'].get).toBeDefined();
			expect(spec.paths['/health'].get.summary).toBe('Root Health Check');
		});

		it('includes routes from the "" controller', () => {
			const spec = swaggerIntegration.getSwaggerSpec();
			expect(spec.paths['/ping']).toBeDefined();
			expect(spec.paths['/ping'].get).toBeDefined();
			expect(spec.paths['/ping'].get.summary).toBe('Empty Path Ping');
		});

		it('uses the "Root" tag as fallback for both controllers', () => {
			const spec = swaggerIntegration.getSwaggerSpec();
			expect(spec.paths['/health'].get.tags).toEqual(['Root']);
			expect(spec.paths['/ping'].get.tags).toEqual(['Root']);
		});
	});

	describe('Postman collection generation', () => {
		const postmanIntegration = new PostmanIntegration({
			title: 'Root Path Test API',
		});

		beforeAll(() => {
			postmanIntegration.generatePostmanCollection(controllers);
		});

		it('generates a collection without crashing', () => {
			const collection = postmanIntegration.getPostmanCollection()!;
			expect(collection).toBeDefined();
			expect(collection.info.name).toBe('Root Path Test API');
		});

		it('places routes of both controllers into the "root" folder', () => {
			const collection = postmanIntegration.getPostmanCollection()!;
			const rootFolder = collection.item.find(
				(folder: any) => folder.name === 'root',
			)!;
			expect(rootFolder).toBeDefined();

			const requestNames = rootFolder.item.map((item: any) => item.name);
			expect(requestNames).toContain('Root Health Check');
			expect(requestNames).toContain('Empty Path Ping');
		});

		it('builds correct request paths without duplicate slashes', () => {
			const collection = postmanIntegration.getPostmanCollection()!;
			const rootFolder = collection.item.find(
				(folder: any) => folder.name === 'root',
			)!;
			expect(rootFolder).toBeDefined();

			const rawUrls = rootFolder.item.map((item: any) => item.request.url.raw);
			expect(rawUrls).toContain('{{baseUrl}}/health');
			expect(rawUrls).toContain('{{baseUrl}}/ping');
		});
	});

	describe('Express routing', () => {
		let app: Express;

		beforeAll(() => {
			app = buildApp(express(), controllers);
		});

		it('serves routes of the "/" controller', async () => {
			const response = await request(app).get('/health');
			expect(response.status).toBe(200);
			expect(response.body).toEqual({ status: 'ok', source: 'root-slash' });
		});

		it('serves routes of the "" controller', async () => {
			const response = await request(app).get('/ping');
			expect(response.status).toBe(200);
			expect(response.body).toEqual({ status: 'ok', source: 'empty-path' });
		});
	});
});
