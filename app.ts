import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { IApp } from './interfaces/app.interface';
import { IConfig } from './interfaces/config.interface';
import { buildApp, IController } from './rest';
import { Container, injectable, multiInject } from 'inversify';
import { SwaggerIntegration } from './swagger';
import { MINI_TYPES } from './types';
import container from './container';

@injectable()
class App implements IApp {
	app: Express;
	container: Container;

	constructor(@multiInject(MINI_TYPES.IController) private controllers: IController[]) {
		this.app = express();
		this.container = container;
		console.log(this.controllers)
	}

	async init(config: IConfig) {
		this.app.use(express.json());
		this.app.use(express.urlencoded({ extended: true }));
		this.app.use(cors());
		this.app.use(morgan('dev'));
		this.app.listen(config.port, () => {
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
	getApp(){
		return this.app;
	}



	async afterInit() {
		// console.log('afterInit');
	}
}

export default App;
