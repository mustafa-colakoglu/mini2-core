import { NextFunction, Response } from 'express';
import { UnauthorizedException } from '../expections/http.expection';
import { IAuthenticatedRequest } from '../interfaces/authenticated.interface';

export const authenticatedMiddleware = (
	req: IAuthenticatedRequest,
	_res: Response,
	next: NextFunction
) => {
	if (req.authenticated) next();
	else
		throw new UnauthorizedException({
			message: 'Unauthorized',
		});
};
