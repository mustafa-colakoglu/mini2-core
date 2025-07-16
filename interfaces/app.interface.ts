import { IConfig } from './config.interface';

export interface IApp {
	init(config: IConfig): Promise<void>;
	afterInit(): Promise<void>;
}
