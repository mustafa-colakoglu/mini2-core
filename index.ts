import App from "./app";
import container from "./container";
import { IApp } from "./interfaces/app.interface";
import { MINI_TYPES } from "./types";
// Main Application class

// Container Class ve instance için
export * from "inversify";
export { container };
export { IApp };
export { App };
export { MINI_TYPES };

// Interfaces
export * from "./interfaces/app.interface";
export * from "./interfaces/authenticated.interface";
export * from "./interfaces/config.interface";
export * from "./interfaces/queue.interface";
export * from "./interfaces/repository.interface";

// Middlewares
export * from "./middlewares/authenticated.middleware";
export * from "./middlewares/authorized.middleware";
export * from "./middlewares/validation.middleware";
export * from "./middlewares/context.middleware";

// Utils
export * from "./utils/array-unify";
export * from "./utils/math";
export * from "./utils/context";

// Exceptions
export * from "./expections/http.expection";
export { default as HttpException } from "./expections/http.expection";

// Types
export * from "./types";

// Response builder
export * from "./response-builder";

// REST utilities
export * from "./rest";

// Swagger integration
export * from "./swagger";

container.bind<IApp>(MINI_TYPES.IApp).to(App).inSingletonScope();
