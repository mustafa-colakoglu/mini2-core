import { IConfig } from './config.interface';
import { Express } from 'express';
export interface IApp {
	init(config: IConfig): Promise<void>;
	afterInit(standartErrorHandler?:boolean): Promise<void>;
	getApp():Express;
}
