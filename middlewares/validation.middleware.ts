import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import type { IValidationError } from '../expections/http.expection';
import HttpException from '../expections/http.expection';

const validationMiddleware = <T extends object>(
	type: new () => T,
	value: 'body' | 'query' | 'params',
	skipMissingProperties = false,
	whitelist = true,
	forbidNonWhitelisted = true
): RequestHandler => {
	return (req: Request, _res: Response, next: NextFunction) => {
		// Query parametrelerinde boolean değerleri düzgün işle
		if (value === 'query' && req.query) {
			Object.keys(req.query).forEach((key) => {
				if (req.query[key] === 'true') req.query[key] = true as any;
				if (req.query[key] === 'false') req.query[key] = false as any;
			});
		}

		// 🔽 Eğer dosya alanları varsa, req.body'ye dahil et
		if (value === 'body' && req.files) {
			const files = req.files as Record<string, Express.Multer.File[]>;
			for (const field in files) {
				if (Array.isArray(files[field]) && files[field].length > 0) {
					req.body[field] = files[field][0]; // sadece ilk dosyayı al
				}
			}
		}

		const data = plainToInstance(type, req[value], {
			enableImplicitConversion: true, // Otomatik tip dönüşümü için
			exposeDefaultValues: true,
		});

		validate(data as object, {
			skipMissingProperties,
			whitelist,
			forbidNonWhitelisted,
		}).then((errors: ValidationError[]) => {
			if (errors.length > 0) {
				const messages: IValidationError[] = errors.map(
					(error: ValidationError) => {
						const error1: IValidationError = {
							field: error.property,
							errors: [],
						};
						for (const key of Object.keys(error?.constraints || {})) {
							if (error.constraints?.[key]) {
								error1.errors.push(error.constraints[key]);
							}
						}
						return error1;
					}
				);
				next(
					new HttpException(
						{
							errorId: 1,
							message: 'Validation error',
							validationErrors: messages,
						},
						400
					)
				);
			} else {
				req[value] = data as any;
				next();
			}
		});
	};
};

export default validationMiddleware;
