import express, { Express } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { IConfig } from '../interfaces/config.interface';

/**
 * Applies JSON/urlencoded body parsers and optional default cors + morgan.
 * Defaults preserve prior behavior (cors and morgan enabled).
 */
export function applyDefaultMiddlewares(app: Express, config: IConfig): void {
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	const mw = config.middleware;
	const useCors = mw?.cors !== false;
	const useMorgan = mw?.morgan !== false;

	if (useCors) {
		app.use(cors());
	}
	if (useMorgan) {
		app.use(morgan(mw?.morganFormat ?? 'dev'));
	}
}
