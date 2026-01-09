import App from './app';
import { container, autoBind } from './container';
import { IApp } from './interfaces/app.interface';
import { MINI_TYPES } from './types';
// Main Application class

// Container Class ve instance için
export * from 'inversify';
export { container };
export { autoBind as AutoBind };
export { IApp };
export { App };
export { MINI_TYPES };

// Interfaces
export * from './interfaces/app.interface';
export * from './notations/controller/interfaces/authenticated.interface';
export * from './interfaces/config.interface';

// Middlewares
export * from './notations/controller/middlewares/authenticated.middleware';
export * from './notations/controller/middlewares/authorized.middleware';
export * from './notations/controller/middlewares/validation.middleware';

// Utils
export * from './utils/array-unify';
export * from './utils/math';

// Exceptions
export * from './expections/http.expection';
export { default as HttpException } from './expections/http.expection';

// Types
export * from './types';

// Response builder
export * from './response-builder';

// REST utilities
export * from './notations';

// Swagger integration
export * from './swagger';

container.bind<IApp>(MINI_TYPES.IApp).to(App).inSingletonScope();
