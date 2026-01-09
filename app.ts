import express, { Express, NextFunction, Request, Response } from 'express';
import { Server } from 'http';
import cors from 'cors';
import morgan from 'morgan';
import { IApp } from './interfaces/app.interface';
import { IConfig } from './interfaces/config.interface';
import { buildApp, IController } from './rest';
import { Container, injectable } from 'inversify';
import { SwaggerIntegration } from './swagger';
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
	constructor() {
		this.app = express();

		this.controllers = [];
		this.container = container;
	}

	async init(config: IConfig, loadInjectablesOptions?: LoadInjectablesOptions) {
		if (loadInjectablesOptions?.autoload) {
			loadInjectables(loadInjectablesOptions);
			bindDiscovered();
		}
		this.controllers = container.getAll(MINI_TYPES.IController);
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));
		this.app.use(cors());
		this.app.use(morgan('dev'));
		this.server = this.app.listen(config.port, () => {
			console.log(`Server is running on port ${config.port}`);
		});
		const swaggerIntegration = new SwaggerIntegration({
			title: config.applicationName,
			description: `API documentation for ${config.applicationName}`,
			version: '1.0.0',
			servers: [
				{
					url: `http://${config.host}:${config.port}`,
					description: 'Development server',
				},
			],
			docsPath: '/api-docs',
			jsonPath: '/api-docs.json',
		});
		swaggerIntegration.generateSwaggerSpec(this.controllers);
		swaggerIntegration.setupSwagger(this.app);
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
				}
			);
		}
	}
}

export default App;
