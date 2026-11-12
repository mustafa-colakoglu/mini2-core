import express, { Express, NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import { IApp } from './interfaces/app.interface';
import { IConfig } from './interfaces/config.interface';
import { buildApp, IController } from './notations';
import { Container, injectable } from 'inversify';
import { setupApiDocumentation } from './api-docs/setup-api-docs';
import { applyDefaultMiddlewares } from './utils/default-middleware';
import { MINI_TYPES } from './types';
import { bindDiscovered, container } from './container';
import HttpException from './expections/http.expection';
import { loadInjectables, LoadInjectablesOptions } from './loader';

@injectable()
class App implements IApp {
	app: Express;
	container: Container;
	controllers: IController[];
	server!: Server;
	loadedInjectables: boolean = false;
	constructor() {
		this.app = express();

		this.controllers = [];
		this.container = container;
	}
	loadInjectables(loadInjectablesOptions?: LoadInjectablesOptions) {
		if (loadInjectablesOptions?.autoload) {
			(globalThis as any).MINI_AUTOLOAD = true;
			loadInjectables(loadInjectablesOptions);
			bindDiscovered();
			this.loadedInjectables = true;
		}
	}
	async init(config: IConfig, loadInjectablesOptions?: LoadInjectablesOptions) {
		this.loadInjectables(loadInjectablesOptions);
		this.expressAppInitialize(config);
	}
	expressAppInitialize(config: IConfig) {
		applyDefaultMiddlewares(this.app, config);
		this.server = this.app.listen(config.port, () => {
			console.log(`Server is running on port ${config.port}`);
		});
		this.controllers = container.getAll(MINI_TYPES.IController);
		setupApiDocumentation(this.app, config, this.controllers);
		buildApp(this.app, this.controllers);
	}
	getApp() {
		return this.app;
	}

	async afterInit(standartErrorHandler: boolean = true) {
		if (standartErrorHandler) {
			this.app.use(
				(error: unknown, _req: Request, res: Response, _next: NextFunction) => {
					if (error instanceof HttpException) {
						res.status(error.code).json(error.messageJson);
					} else {
						console.error('Unexpected error:', error);
						res.status(500).json({
							errorId: 1,
							message: 'Some error happen',
						});
					}
				},
			);
		}
	}
}

export default App;
