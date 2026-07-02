import 'reflect-metadata';
import express, { Express, NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import cors from 'cors';
import morgan from 'morgan';
import { Container, injectable } from 'inversify';
import { IConfig } from './interfaces/config.interface';
import { buildApp, IController } from './notations';
import { SwaggerIntegration } from './api-docs/swagger';
import { PostmanIntegration } from './api-docs/postman';
import { MINI_TYPES } from './types';
import { container } from './container';
import HttpException from './expections/http.expection';

export const keyOfMini2AppConfig = Symbol('mini2AppConfig');

const MINI2_APP_REGISTRY_KEY = Symbol.for('MINI2_APP_REGISTRY');

export type Mini2AppRegistration = {
	target: new (...args: any[]) => Mini2AppClass;
	config: IConfig;
};

export function getMini2AppRegistry(): Mini2AppRegistration[] {
	const g = globalThis as any;
	if (!g[MINI2_APP_REGISTRY_KEY]) g[MINI2_APP_REGISTRY_KEY] = [];
	return g[MINI2_APP_REGISTRY_KEY] as Mini2AppRegistration[];
}

export interface IAppV2 {
	server?: Server | undefined;
	controllers: IController[];
	config: IConfig;
	start(): Promise<void>;
	stop(): Promise<void>;
	getApp(): Express;
}

/**
 * AppV2 base class. `@Mini2App(config)` ile dekore edilmiş ve bu class'tan
 * extend eden bir class, `startMini2App()` ile otomatik olarak başlatılır.
 *
 * Pipeline adımları (`start()` içinde sırasıyla):
 * onBeforeInit → setupMiddlewares → resolveControllers → setupDocs →
 * setupRoutes → setupErrorHandler → listen → onAfterInit
 *
 * Adımların tamamı `protected` olduğu için alt class'larda override edilebilir.
 */
export class Mini2AppClass implements IAppV2 {
	app: Express;
	server?: Server | undefined;
	container: Container;
	controllers: IController[] = [];
	config!: IConfig;

	constructor() {
		this.app = express();
		this.container = container;
	}

	async start(): Promise<void> {
		this.config = this.resolveConfig();
		await this.onBeforeInit();
		this.setupMiddlewares();
		this.resolveControllers();
		this.setupDocs();
		this.setupRoutes();
		this.setupErrorHandler();
		await this.listen();
		await this.onAfterInit();
	}

	async stop(): Promise<void> {
		if (!this.server) return;
		await new Promise<void>((resolve, reject) => {
			this.server!.close((error) => (error ? reject(error) : resolve()));
		});
		this.server = undefined;
	}

	getApp(): Express {
		return this.app;
	}

	/* ---------------- overridable hooks ---------------- */

	protected async onBeforeInit(): Promise<void> {
		// Alt class'lar override edebilir.
	}

	protected async onAfterInit(): Promise<void> {
		// Alt class'lar override edebilir.
	}

	protected onError(error: unknown, _req: Request, res: Response): void {
		if (error instanceof HttpException) {
			res.status(error.code).json(error.messageJson);
		} else {
			console.error('Unexpected error:', error);
			res.status(500).json({
				errorId: 1,
				message: 'Some error happen',
			});
		}
	}

	/* ---------------- pipeline steps ---------------- */

	protected resolveConfig(): IConfig {
		const config: IConfig | undefined = Reflect.getMetadata(
			keyOfMini2AppConfig,
			this.constructor
		);
		if (!config) {
			throw new Error(
				`${this.constructor.name} must be decorated with @Mini2App(config)`
			);
		}
		return config;
	}

	protected setupMiddlewares(): void {
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));
		this.app.use(cors());
		this.app.use(morgan('dev'));
	}

	protected resolveControllers(): void {
		this.controllers = this.container.isBound(MINI_TYPES.IController)
			? this.container.getAll<IController>(MINI_TYPES.IController)
			: [];
	}

	protected setupDocs(): void {
		const config = this.config;
		const servers = config.swaggerServers ?? [
			{
				url: `http://${config.host}:${config.port}`,
				description: 'Development server',
			},
		];

		const swaggerIntegration = new SwaggerIntegration({
			title: config.applicationName,
			description: `API documentation for ${config.applicationName}`,
			version: '1.0.0',
			servers,
			docsPath: config.swaggerDocsPath ?? '/api-docs',
			jsonPath: config.swaggerJsonPath ?? '/api-docs.json',
			...(config.swaggerBasicAuth && { basicAuth: config.swaggerBasicAuth }),
		});
		swaggerIntegration.generateSwaggerSpec(this.controllers);
		swaggerIntegration.setupSwagger(this.app);

		const postmanIntegration = new PostmanIntegration({
			title: config.applicationName,
			description: `API documentation for ${config.applicationName}`,
			version: '1.0.0',
			servers,
			jsonPath: config.postmanJsonPath ?? '/postman.json',
			...(config.swaggerBasicAuth && { basicAuth: config.swaggerBasicAuth }),
		});
		postmanIntegration.generatePostmanCollection(this.controllers);
		postmanIntegration.setupPostman(this.app);
	}

	protected setupRoutes(): void {
		buildApp(this.app, this.controllers);
	}

	protected setupErrorHandler(): void {
		this.app.use(
			(error: unknown, req: Request, res: Response, _next: NextFunction) => {
				this.onError(error, req, res);
			}
		);
	}

	protected listen(): Promise<void> {
		return new Promise((resolve) => {
			this.server = this.app.listen(this.config.port, () => {
				console.log(`Server is running on port ${this.config.port}`);
				resolve();
			});
		});
	}
}

/**
 * AppV2 class decorator'ı. Class'ı global registry'ye kaydeder, config'i
 * metadata olarak iliştirir ve `MINI_TYPES.IAppV2` token'ı ile container'a
 * singleton olarak bind eder. Uygulamada yalnızca bir tane @Mini2App class'ı
 * olabilir.
 */
export function Mini2App(config: IConfig) {
	return function <T extends new (...args: any[]) => Mini2AppClass>(
		target: T
	): T {
		const registry = getMini2AppRegistry();
		const existing = registry[0];
		if (existing && existing.target !== target) {
			throw new Error(
				`Only one @Mini2App class is allowed. "${existing.target.name}" is already registered, cannot register "${target.name}".`
			);
		}

		Reflect.defineMetadata(keyOfMini2AppConfig, config, target);

		if (!existing) {
			registry.push({ target, config });
			injectable()(target);
			if (!container.isBound(MINI_TYPES.IAppV2)) {
				container.bind(MINI_TYPES.IAppV2).to(target).inSingletonScope();
			}
		}

		return target;
	};
}
