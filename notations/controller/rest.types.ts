import { RequestHandler } from 'express';
import { IValidation } from './middlewares/validation.middleware';

export type Method = 'get' | 'post' | 'put' | 'delete' | 'patch';
export type IExtraData = Map<string, any>;
export type ParameterSlot =
	| 'req'
	| 'res'
	| 'next'
	| 'body'
	| 'query'
	| 'params'
	| 'headers';

export type RequestHandlerWithPreMiddlewareOptions = {
	handler: RequestHandler;
	isPre: boolean;
	order: number;
};

export interface RouteOptions {
	method?: Method;
	path?: string;
	validations?: IValidation[];
	permissions?: string[];
	authenticated?: boolean;
	otherHttpMiddlewares?: RequestHandlerWithPreMiddlewareOptions[];
	extraData?: IExtraData;
	name?: string;
}

export interface RouteDefinition extends RouteOptions {
	methodName: string;
	parameterIndices?: Partial<Record<ParameterSlot, number>>;
}

export interface RouteDefinitions {
	basePath: string;
	controllerName?: string;
	moduleName?: string;
	routes: RouteDefinition[];
}

export interface IControllerClassConstructor {
	new (...args: any[]): any;
	__routeDefinitions?: RouteDefinitions;
}
export interface IController {
	path: string;
	name: string;
	moduleName: string;
	getRouteDefinition(methodName: string): RouteDefinition;
	getRouteDefinitions(): RouteDefinitions;
}
