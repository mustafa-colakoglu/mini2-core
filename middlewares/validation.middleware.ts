import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
export type IValidation = {
  body?: any;
  params?: any;
  query?: any;
  headers?:any;
};
export default function validationMiddleware(
  ValidationClass: new (...args: any[]) => any,
  type: keyof IValidation
): RequestHandler {
  const handler: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const source =
        type === 'body' ? req.body :
        type === 'query' ? req.query :
        type === 'headers' ? req.headers :
                            req.params;

      // class-transformer
      const instance = plainToInstance(ValidationClass, source, {
        enableImplicitConversion: true,
        exposeDefaultValues: true,
      });

      // class-validator
      const errors = await validate(instance as object, {
        whitelist: true,
        forbidNonWhitelisted: false,
        skipMissingProperties: false,
        validationError: { target: false, value: false },
      });

      if (errors.length > 0) {
        res.status(400).json({
          ok: false,
          message: 'Validation error',
          errors: errors.map(e => ({
            property: e.property,
            constraints: e.constraints,
          })),
        });
        return; // <-- explicit return
      }

      // validated* alanlarına yaz
      if (type === 'body')   (req as any).validatedBody = instance;
      if (type === 'query')  (req as any).validatedQuery = instance;
      if (type === 'params') (req as any).validatedParams = instance;

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