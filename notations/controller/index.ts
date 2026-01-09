import 'reflect-metadata';
import express, { type Express } from 'express';
import type {
	Request,
	Response,
	NextFunction,
	IRouter,
	RequestHandler,
} from 'express';
import { arrayUnify } from '../../utils/array-unify';
import { IResponseBuilder } from '../../response-builder';
import validationMiddleware, {
	IValidation,
} from './middlewares/validation.middleware';
import { authenticatedMiddleware } from './middlewares/authenticated.middleware';
import { authorizedMiddleware } from './middlewares/authorized.middleware';
import { autoBind } from '../../container';
import { MINI_TYPES } from '../../types';
import {
	IController,
	IControllerClassConstructor,
	IExtraData,
	ParameterSlot,
	RouteDefinition,
	RouteDefinitions,
	RouteOptions,
} from './rest.types';

export class Controller implements IController {
	path: string;
	name: string;
	moduleName: string;
	routeDefinitions: RouteDefinitions;

	constructor() {
		const ctor = this.constructor as any;

		const metaPath: string = Reflect.getMetadata(keyOfPath, ctor);
		const metaName = Reflect.getMetadata(keyOfName, ctor);
		const metaModuleName: string | undefined = Reflect.getMetadata(
			keyOfModuleName,
			ctor
		);
		this.path = metaPath;
		this.name = metaName || metaPath;
		this.moduleName = metaModuleName || metaName;

		this.routeDefinitions = RouteRegistry.getRouteDefinitions(ctor);
	}
	getRouteDefinition(methodName: string): RouteDefinition {
		const find = this.routeDefinitions.routes.find(
			(item) => item.methodName === methodName
		);
		if (!find) throw new Error('Route definition of method not found');
		return find;
	}
	getRouteDefinitions(): RouteDefinitions {
		return this.routeDefinitions;
	}
}

export class RouteRegistry {
	private static getCtor(target: any): IControllerClassConstructor {
		return typeof target === 'function'
			? target
			: (target.constructor as IControllerClassConstructor);
	}

	static getRouteDefinitions(target: any): RouteDefinitions {
		const ctor = this.getCtor(target);
		if (!ctor.__routeDefinitions) {
			ctor.__routeDefinitions = { basePath: '', routes: [] };
		}
		return ctor.__routeDefinitions;
	}

	static setBasePath(
		constructor: IControllerClassConstructor,
		basePath: string,
		controllerName?: string,
		moduleName?: string
	) {
		const defs = this.getRouteDefinitions(constructor);
		defs.basePath = basePath;
		if (controllerName !== undefined) defs.controllerName = controllerName;
		if (moduleName !== undefined) defs.moduleName = moduleName;
	}

	static getOrCreateRoute(target: any, methodName: string): RouteDefinition {
		const defs = this.getRouteDefinitions(target);
		let route = defs.routes.find((r) => r.methodName === methodName);
		if (!route) {
			route = {
				methodName,
				validations: [],
				permissions: [],
				otherHttpMiddlewares: [],
				parameterIndices: {},
			};
			defs.routes.push(route);
		}
		return route;
	}

	static updateRoute(
		target: any,
		methodName: string,
		updates: Omit<RouteDefinition, 'methodName'>
	) {
		const route = this.getOrCreateRoute(target, methodName);

		if (updates.validations && updates.validations.length) {
			route.validations = [...(route.validations ?? []), ...updates.validations];
		}
		if (updates.permissions && updates.permissions.length) {
			route.permissions = Array.from(
				new Set([...(route.permissions ?? []), ...updates.permissions])
			);
		}
		if (updates.otherHttpMiddlewares && updates.otherHttpMiddlewares.length) {
			route.otherHttpMiddlewares = Array.from(
				new Set([
					...(route.otherHttpMiddlewares ?? []),
					...updates.otherHttpMiddlewares,
				])
			);
		}

		if (updates.method !== undefined) route.method = updates.method;
		if (updates.path !== undefined) route.path = updates.path;
		if (updates.name !== undefined) route.name = updates.name;
		if (updates.authenticated !== undefined)
			route.authenticated = updates.authenticated;
		if (updates.extraData !== undefined) route.extraData = updates.extraData;

		if (updates.parameterIndices) {
			route.parameterIndices = {
				...(route.parameterIndices ?? {}),
				...updates.parameterIndices,
			};
		}
	}

	static setParameterIndex(
		target: any,
		methodName: string,
		slot: ParameterSlot,
		index: number
	) {
		const route = this.getOrCreateRoute(target, methodName);
		route.parameterIndices = { ...(route.parameterIndices ?? {}), [slot]: index };
	}

	static getRoutes(target: any): RouteDefinition[] {
		return this.getRouteDefinitions(target).routes;
	}
	static getBasePathOf(target: any): string {
		return this.getRouteDefinitions(target).basePath;
	}
}

/* ------------------------------------------------------------------ */
/* Metadata Keys                                                       */
/* ------------------------------------------------------------------ */
export const keyOfPath = Symbol('path');
export const keyOfName = Symbol('name');
export const keyOfModuleName = Symbol('moduleName');
export const keyOfRouteOptions = Symbol('routeOptions');
export const keyOfReq = Symbol('req');
export const keyOfRes = Symbol('res');
export const keyOfNext = Symbol('next');
export const keyOfBody = Symbol('body');
export const keyOfQuery = Symbol('query');
export const keyOfParams = Symbol('params');
export const keyOfHeaders = Symbol('headers');

/* ------------------------------------------------------------------ */
/* Decorators                                                          */
/* ------------------------------------------------------------------ */
export function controller(path: string, name?: string, moduleName?: string) {
	return function <T extends { new (...args: any[]): Controller }>(
		constructor: T
	) {
		const resolvedName = name ?? path;
		const resolvedModuleName = moduleName ?? resolvedName;

		// metadata'yı DOĞRUDAN orijinal constructor'a ya	z
		Reflect.defineMetadata(keyOfPath, path, constructor);
		Reflect.defineMetadata(keyOfName, resolvedName, constructor);
		Reflect.defineMetadata(keyOfModuleName, resolvedModuleName, constructor);

		RouteRegistry.setBasePath(
			constructor as unknown as any,
			path,
			resolvedName,
			resolvedModuleName
		);
		if ((globalThis as any).MINI_AUTOLOAD) {
			return autoBind(MINI_TYPES.IController, { scope: 'Transient' })(constructor);
		}
		return constructor;
	};
}

export function httpMethod(newOptions: RouteOptions) {
	return function (
		target: any,
		propertyKey: string,
		_descriptor: PropertyDescriptor
	) {
		const existingOptions: RouteOptions =
			Reflect.getMetadata(keyOfRouteOptions, target, propertyKey) || {};

		const method = newOptions.method ?? existingOptions.method;
		const path = newOptions.path ?? existingOptions.path;

		const validations = arrayUnify(
			(newOptions.validations ?? []).concat(existingOptions.validations ?? [])
		);
		const permissions = arrayUnify(
			(newOptions.permissions ?? []).concat(existingOptions.permissions ?? [])
		);
		const authenticated =
			newOptions.authenticated !== undefined
				? newOptions.authenticated
				: existingOptions.authenticated;
		const otherHttpMiddlewares = arrayUnify(
			(newOptions.otherHttpMiddlewares ?? []).concat(
				existingOptions.otherHttpMiddlewares ?? []
			)
		);
		const name = newOptions.name ?? existingOptions.name;

		const extraData: IExtraData =
			existingOptions.extraData ?? new Map<string, any>();
		if (newOptions.extraData) {
			const newOptionsExtraData = newOptions.extraData;
			for (const k of Array.from(newOptionsExtraData.keys())) {
				const currentValue = extraData.get(k);
				if (currentValue === undefined) {
					extraData.set(k, newOptionsExtraData.get(k));
					continue;
				}
				const newValue = newOptionsExtraData.get(k);
				let finalValue = currentValue;
				if (Array.isArray(currentValue)) {
					finalValue = arrayUnify([
						...(currentValue as any[]),
						...(newValue as any[]),
					]);
				} else if (
					currentValue !== null &&
					typeof currentValue === 'object' &&
					Object.getPrototypeOf(currentValue) === Object.prototype &&
					newValue !== null &&
					typeof newValue === 'object' &&
					Object.getPrototypeOf(newValue) === Object.prototype
				) {
					finalValue = { ...currentValue, ...newValue };
				} else {
					finalValue = newValue;
				}
				extraData.set(k, finalValue);
			}
		}

		const mergedOptions: RouteOptions = {};
		if (method !== undefined) mergedOptions.method = method;
		if (path !== undefined) mergedOptions.path = path;
		if (validations.length) mergedOptions.validations = validations;
		if (permissions.length) mergedOptions.permissions = permissions;
		if (authenticated !== undefined) mergedOptions.authenticated = authenticated;
		if (otherHttpMiddlewares.length)
			mergedOptions.otherHttpMiddlewares = otherHttpMiddlewares;
		if (name !== undefined) mergedOptions.name = name;
		if (extraData && extraData.size > 0) mergedOptions.extraData = extraData;

		// NOT: method/param dekoratör metadataları **prototype** üzerinde tutuluyor
		Reflect.defineMetadata(keyOfRouteOptions, mergedOptions, target, propertyKey);

		const updates: Partial<RouteDefinition> = {
			...(validations.length ? { validations } : {}),
			...(permissions.length ? { permissions } : {}),
			...(otherHttpMiddlewares.length ? { otherHttpMiddlewares } : {}),
		};
		if (method !== undefined) updates.method = method;
		if (path !== undefined) updates.path = path;
		if (name !== undefined) updates.name = name;
		if (authenticated !== undefined) updates.authenticated = authenticated;
		if (extraData && extraData.size > 0) updates.extraData = extraData;

		RouteRegistry.updateRoute(target, propertyKey, updates);
	};
}

/* HTTP method sugar */
export function get(path: string, name?: string) {
	return httpMethod({ path, method: 'get', name: name ?? path });
}
export function post(path: string, name?: string) {
	return httpMethod({ path, method: 'post', name: name ?? path });
}
export function put(path: string, name?: string) {
	return httpMethod({ path, method: 'put', name: name ?? path });
}
export function del(path: string, name?: string) {
	return httpMethod({ path, method: 'delete', name: name ?? path });
}
export function patch(path: string, name?: string) {
	return httpMethod({ path, method: 'patch', name: name ?? path });
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
	return httpMethod({ permissions: Array.isArray(value) ? value : [value] });
}
export function middleware(
	mw: RequestHandler,
	isPre?: boolean,
	order?: number
) {
	return httpMethod({
		otherHttpMiddlewares: [{ handler: mw, isPre: !!isPre, order: order ?? 0 }],
	});
}
export function custom<T>(key: string, value: T) {
	const extraData = new Map<string, T>();
	extraData.set(key, value);
	return httpMethod({ extraData: extraData as IExtraData });
}

export function req() {
	return (t: any, k: string, i: number) => {
		Reflect.defineMetadata(keyOfReq, i, t, k);
		RouteRegistry.setParameterIndex(t, k, 'req', i);
	};
}
export function res() {
	return (t: any, k: string, i: number) => {
		Reflect.defineMetadata(keyOfRes, i, t, k);
		RouteRegistry.setParameterIndex(t, k, 'res', i);
	};
}
export function next() {
	return (t: any, k: string, i: number) => {
		Reflect.defineMetadata(keyOfNext, i, t, k);
		RouteRegistry.setParameterIndex(t, k, 'next', i);
	};
}
export function body() {
	return (t: any, k: string, i: number) => {
		Reflect.defineMetadata(keyOfBody, i, t, k);
		RouteRegistry.setParameterIndex(t, k, 'body', i);
	};
}
export function query() {
	return (t: any, k: string, i: number) => {
		Reflect.defineMetadata(keyOfQuery, i, t, k);
		RouteRegistry.setParameterIndex(t, k, 'query', i);
	};
}
export function params() {
	return (t: any, k: string, i: number) => {
		Reflect.defineMetadata(keyOfParams, i, t, k);
		RouteRegistry.setParameterIndex(t, k, 'params', i);
	};
}
export function headers() {
	return (t: any, k: string, i: number) => {
		Reflect.defineMetadata(keyOfHeaders, i, t, k);
		RouteRegistry.setParameterIndex(t, k, 'headers', i);
	};
}
export function buildRouterFromController(
	controllerInstance: IController
): IRouter {
	const ctor = controllerInstance.constructor as any;
	const proto = Object.getPrototypeOf(controllerInstance);

	const path = Reflect.getMetadata(keyOfPath, ctor);
	if (!path) throw new Error('Controller class must have a path property');

	const allProperties = Object.getOwnPropertyNames(proto);
	const router = express.Router();

	for (const property of allProperties) {
		const routeOptions: RouteOptions = Reflect.getMetadata(
			keyOfRouteOptions,
			proto,
			property
		);
		if (!routeOptions) continue;
		if (!routeOptions.path)
			throw new Error(`Route path is required for ${ctor.name}.${property}`);
		if (!routeOptions.method)
			throw new Error(`Route method is required for ${ctor.name}.${property}`);

		const { validations, permissions, authenticated, otherHttpMiddlewares } =
			routeOptions;

		const handler = (proto as any)[property].bind(controllerInstance);

		const validationMiddlewares: RequestHandler[] = [];
		const pushOnce = (arr: RequestHandler[], mw: RequestHandler) => {
			if (!arr.includes(mw)) arr.push(mw);
		};
		const order: Array<keyof IValidation> = [
			'params',
			'query',
			'body',
			'headers',
		];
		for (const v of validations ?? []) {
			for (const t of order) {
				const validationClass = v[t];
				if (!validationClass) continue;
				pushOnce(
					validationMiddlewares,
					validationMiddleware(
						validationClass,
						t,
						v.logging,
						v.transformOptions,
						v.validatorOptions
					)
				);
			}
		}

		const middlewares: RequestHandler[] = [];
		if (otherHttpMiddlewares) {
			const isPreMiddlwaresSorted = otherHttpMiddlewares
				.filter((item) => item.isPre)
				.sort((x, y) => x.order - y.order);
			middlewares.push(...isPreMiddlwaresSorted.map((item) => item.handler));
		}
		if (validationMiddlewares.length) middlewares.push(...validationMiddlewares);
		if (authenticated)
			middlewares.push(authenticatedMiddleware as RequestHandler);
		if (permissions && permissions.length > 0)
			middlewares.push(authorizedMiddleware(permissions) as RequestHandler);
		if (otherHttpMiddlewares) {
			const isNormalMiddlewares = otherHttpMiddlewares.filter(
				(item) => !item.isPre
			);
			middlewares.push(...isNormalMiddlewares.map((item) => item.handler));
		}

		const method = routeOptions.method!;
		const routePath = routeOptions.path!;

		const reqIndex = Reflect.getMetadata(keyOfReq, proto, property);
		const resIndex = Reflect.getMetadata(keyOfRes, proto, property);
		const nextIndex = Reflect.getMetadata(keyOfNext, proto, property);
		const bodyIndex = Reflect.getMetadata(keyOfBody, proto, property);
		const queryIndex = Reflect.getMetadata(keyOfQuery, proto, property);
		const paramsIndex = Reflect.getMetadata(keyOfParams, proto, property);

		const handlerMiddleware = async (
			req: Request,
			res: Response,
			next: NextFunction
		) => {
			try {
				const argMap = new Map<number, any>();
				if (typeof reqIndex === 'number') argMap.set(reqIndex, req);
				if (typeof resIndex === 'number') argMap.set(resIndex, res);
				if (typeof nextIndex === 'number') argMap.set(nextIndex, next);
				if (typeof bodyIndex === 'number')
					argMap.set(bodyIndex, (req as any).validatedBody ?? req.body);
				if (typeof queryIndex === 'number')
					argMap.set(queryIndex, (req as any).validatedQuery ?? req.query);
				if (typeof paramsIndex === 'number')
					argMap.set(paramsIndex, (req as any).validatedParams ?? req.params);

				let realArgs: any[];
				if (argMap.size > 0) {
					const maxIndex = Math.max(...Array.from(argMap.keys()));
					realArgs = Array.from({ length: maxIndex + 1 }, (_, i) => argMap.get(i));
				} else {
					realArgs = [req, res, next];
				}

				const result = await handler(...realArgs);
				if (result && typeof (result as any).build === 'function') {
					(result as IResponseBuilder).build(res);
				} else if (!res.headersSent) {
					res.json(result);
				}
			} catch (error) {
				next(error);
			}
		};

		(router as any)[method](
			routePath,
			...middlewares,
			handlerMiddleware as RequestHandler
		);
	}

	return router;
}
export function buildApp(app: Express, controllers: IController[]) {
	for (const instance of controllers) {
		const router = buildRouterFromController(instance);
		const controllerPath = Reflect.getMetadata(keyOfPath, instance.constructor);
		if (controllerPath) app.use(controllerPath, router);
		else app.use(router);
	}
	return app;
}
