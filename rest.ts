import 'reflect-metadata';
import express, { type Express } from 'express';
import type {
	Request,
	Response,
	NextFunction,
	IRouter,
	RequestHandler,
} from 'express';
import { arrayUnify } from './utils/array-unify';
import { IResponseBuilder } from './response-builder';
import validationMiddleware from './middlewares/validation.middleware';
import { authenticatedMiddleware } from './middlewares/authenticated.middleware';
import { authorizedMiddleware } from './middlewares/authorized.middleware';

export type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';
export const keyOfPath = Symbol('path');
export const keyOfRouteOptions = Symbol('routeOptions');
export const keyOfReq = Symbol('req');
export const keyOfRes = Symbol('res');
export const keyOfNext = Symbol('next');

// Controller method signature type'ı
export type ControllerMethodSignature = (
	...args: (Request | Response | NextFunction)[]
) => IResponseBuilder | Promise<IResponseBuilder>;
export type IValidation = {
	body?: any;
	params?: any;
	query?: any;
};
export interface RouteOptions {
	method?: Method;
	path?: string;
	validations?: IValidation[];
	permissions?: string[];
	authenticated?: boolean;
	otherHttpMiddlewares?: RequestHandler[];
}

export function controller(path: string) {
	return function <T extends { new (...args: any[]): {} }>(constructor: T) {
		Reflect.defineMetadata(keyOfPath, path, constructor);
		return constructor;
	};
}
export function httpMethod(newOptions: RouteOptions) {
	return function (
		target: any,
		propertyKey: string,
		_descriptor: PropertyDescriptor
	) {
		const existingOptions =
			Reflect.getMetadata(keyOfRouteOptions, target, propertyKey) || {};
		const method = newOptions.method || existingOptions.method;
		const path = newOptions.path || existingOptions.path;
		const validations = arrayUnify(
			(newOptions.validations || []).concat(existingOptions.validations || [])
		);
		const permissions = arrayUnify(
			(newOptions.permissions || []).concat(existingOptions.permissions || [])
		);
		const authenticated =
			newOptions.authenticated !== undefined ? newOptions.authenticated : existingOptions.authenticated !== undefined ? existingOptions.authenticated : undefined;
		const otherHttpMiddlewares = arrayUnify(
			(newOptions.otherHttpMiddlewares || []).concat(
				existingOptions.otherHttpMiddlewares || []
			)
		);
		const mergedOptions = {
			method,
			path,
			validations,
			permissions,
			authenticated,
			otherHttpMiddlewares,
		};

		Reflect.defineMetadata(keyOfRouteOptions, mergedOptions, target, propertyKey);
	};
}
export function get(path: string) {
	return httpMethod({ path, method: 'get' });
}
export function post(path: string) {
	return httpMethod({ path, method: 'post' });
}
export function put(path: string) {
	return httpMethod({ path, method: 'put' });
}
export function del(path: string) {
	return httpMethod({ path, method: 'delete' });
}
export function patch(path: string) {
	return httpMethod({ path, method: 'patch' });
}
export function validate(options: IValidation | IValidation[]) {
	return httpMethod({
		validations: Array.isArray(options) ? options : [options],
	});
}
export function authenticated(value: boolean = true) {
	return httpMethod({ authenticated: value });
}
export function authorized(value: string | string[]) {
	return httpMethod({
		permissions: Array.isArray(value) ? value : [value],
	});
}
export function middleware(middlewares: RequestHandler) {
	return httpMethod({ otherHttpMiddlewares: [middlewares] });
}

// Param decorator'ları
export function req() {
	return function (target: any, propertyKey: string, parameterIndex: number) {
		Reflect.defineMetadata(keyOfReq, parameterIndex, target, propertyKey);
	};
}

export function res() {
	return function (target: any, propertyKey: string, parameterIndex: number) {
		Reflect.defineMetadata(keyOfRes, parameterIndex, target, propertyKey);
	};
}
export function next() {
	return function (target: any, propertyKey: string, parameterIndex: number) {
		Reflect.defineMetadata(keyOfNext, parameterIndex, target, propertyKey);
	};
}
export function buildRouterFromController(controllerClass: any): IRouter {
	const path = Reflect.getMetadata(keyOfPath, controllerClass.constructor);
	if (!path) {
		throw new Error('Controller class must have a path property');
	}
	const allProperties = Object.getOwnPropertyNames(
		Object.getPrototypeOf(controllerClass)
	);
	const router = express.Router();
	for (const property of allProperties) {
		const routeOptions: RouteOptions = Reflect.getMetadata(
			keyOfRouteOptions,
			controllerClass,
			property
		);
		if (!routeOptions) {
			continue;
		}
		if (!routeOptions.path) {
			throw new Error('Route path is required');
		}
		if (!routeOptions.method) {
			throw new Error('Route method is required');
		}
		console.log(routeOptions)
		const validations = routeOptions.validations;
		const permissions = routeOptions.permissions;
		const authenticated = routeOptions.authenticated;
		const otherHttpMiddlewares = routeOptions.otherHttpMiddlewares;
		const handler = controllerClass[property];
		const validationMiddlewares = [];
		if (validations) {
			for (const validation of validations) {
				if (validation.body) {
					validationMiddlewares.push(validationMiddleware(validation.body, 'body'));
				}
				if (validation.params) {
					validationMiddlewares.push(
						validationMiddleware(validation.params, 'params')
					);
				}
				if (validation.query) {
					validationMiddlewares.push(
						validationMiddleware(validation.query, 'query')
					);
				}
			}
		}
		const middlewares: RequestHandler[] = [];
		if (authenticated) {
			middlewares.push(authenticatedMiddleware as unknown as RequestHandler);
		}
		if (permissions && permissions.length > 0) {
			middlewares.push(
				authorizedMiddleware(permissions) as unknown as RequestHandler
			);
		}
		if (otherHttpMiddlewares) {
			middlewares.push(...otherHttpMiddlewares);
		}
		if (validationMiddlewares) {
			middlewares.push(...validationMiddlewares);
		}

		const method = routeOptions.method;
		const routePath = routeOptions.path;
		const reqIndex = Reflect.getMetadata(keyOfReq, controllerClass, property);
		const resIndex = Reflect.getMetadata(keyOfRes, controllerClass, property);
		const nextIndex = Reflect.getMetadata(keyOfNext, controllerClass, property);
		const argsNotSorted = [
			{ name: 'req', index: reqIndex },
			{ name: 'res', index: resIndex },
			{ name: 'next', index: nextIndex },
		];
		const args = [...argsNotSorted];
		const argsSorted = args.sort((a, b) => a.index - b.index);
		const handlerMiddleware = async (
			req: Request,
			res: Response,
			next: NextFunction
		) => {
			try {
				const realArgs = [];
				for (const arg of argsSorted) {
					if (arg.name === 'req') {
						realArgs.push(req);
					} else if (arg.name === 'res') {
						realArgs.push(res);
					} else if (arg.name === 'next') {
						realArgs.push(next);
					}
				}
				const result = await handler(...realArgs);

				// ResponseBuilder'ı handle et
				if (result && typeof result.build === 'function') {
					result.build(res);
				} else {
					res.json(result);
				}
			} catch (error) {
				next(error);
			}
		};
		router[method](
			routePath,
			...middlewares,
			handlerMiddleware as RequestHandler
		);
	}
	return router;
}
export function buildApp(app: Express, controllers: any[]) {
	for (const controller of controllers) {
		const router = buildRouterFromController(controller);
		const controllerPath = Reflect.getMetadata(keyOfPath, controller.constructor);
		if (controllerPath) {
			app.use(controllerPath, router);
		} else {
			app.use(router);
		}
	}
	return app;
}
