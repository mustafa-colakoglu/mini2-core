import { IController } from '../notations';
import { IConfig } from './config.interface';
import { Express } from 'express';
import { Server } from 'http';
import { LoadInjectablesOptions } from '../loader';
export interface IApp {
	server: Server;
	controllers: IController[];
	loadedInjectables: boolean;
	loadInjectables(loadInjectablesOptions?: LoadInjectablesOptions): void;
	init(
		config: IConfig,
		loadInjectablesOptions?: LoadInjectablesOptions
	): Promise<void>;
	expressAppInitialize(config: IConfig): void;
	afterInit(standartErrorHandler?: boolean): Promise<void>;
	getApp(): Express;
}
