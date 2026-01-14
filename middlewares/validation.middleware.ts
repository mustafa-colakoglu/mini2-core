import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { plainToInstance, TransformOptions } from 'class-transformer';
import { validate, ValidatorOptions } from 'class-validator';
export type IValidation = {
	body?: any;
	params?: any;
	query?: any;
	headers?: any;
	logging?: boolean;
	transformOptions?: TransformOptions;
	validatorOptions?: ValidatorOptions;
};
export default function validationMiddleware(
	ValidationClass: new (...args: any[]) => any,
	type: keyof IValidation,
	logging?: boolean,
	transformOptions?: TransformOptions,
	validatorOptions?: ValidatorOptions
): RequestHandler {
	const handler: RequestHandler = async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const source =
				type === 'body'
					? req.body
					: type === 'query'
					? req.query
					: type === 'headers'
					? req.headers
					: req.params;

			if (logging) {
				console.log('MINI2@CORE BODY SOURCE ORIGINAL');
				console.log(source);
			}

			// class-transformer
			const instance = plainToInstance(ValidationClass, source, {
				enableImplicitConversion: true,
				exposeDefaultValues: true,
				...transformOptions,
			});

			if (logging) {
				console.log('MINI2@CORE BODY SOURCE TRANSFORMED');
				console.log(instance);
			}

			// class-validator
			const errors = await validate(instance as object, {
				whitelist: true,
				forbidNonWhitelisted: false,
				skipMissingProperties: false,
				validationError: { target: false, value: false },
				...validatorOptions,
			});

			if (errors.length > 0) {
				res.status(400).json({
					ok: false,
					message: 'Validation error',
					errors: errors.map((e) => ({
						property: e.property,
						constraints: e.constraints,
					})),
				});
				return; // <-- explicit return
			}
			if (type === 'headers') {
				// Keep original req.headers to avoid dropping other headers set by previous middlewares
				Object.defineProperty(req as any, 'validatedHeaders', {
					value: instance,
					writable: true,
					configurable: true,
					enumerable: false,
				});
			} else {
				Object.defineProperty(req, type, {
					value: instance, // veya plain objeyi koy
					writable: true,
					configurable: true,
					enumerable: true,
				});
			}
			if (logging) {
				console.log(`MINI2@CORE ASSIGNED INSTANCE TO ${type}`);
				console.log((req as any)[type]);
			}
			next();
			return; // <-- explicit return
		} catch (err: any) {
			res.status(400).json({
				ok: false,
				message: 'Validation middleware failed',
				error: err?.message ?? String(err),
			});
			return; // <-- explicit return
		}
	};

	return handler; // <-- handler'ı açıkça döndür
}
