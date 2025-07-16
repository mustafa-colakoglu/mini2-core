import { NextFunction, Request, Response } from 'express';
import { ForbiddenException } from '../expections/http.expection';

export const authorizedMiddleware = (permissions: string[]) => {
	return (
		req: Request & { user: { permissions: string[] } },
		_res: Response,
		next: NextFunction
	) => {
		if (
			permissions.some((permission) => req.user.permissions.includes(permission))
		)
			next();
		else
			throw new ForbiddenException({
				message: 'Forbidden',
			});
	};
};
