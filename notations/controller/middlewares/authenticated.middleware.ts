import { NextFunction, Response } from 'express';
import { UnauthorizedException } from '../../../expections/http.expection';
import { IAuthenticatedRequest } from '../interfaces/authenticated.interface';

/** Header tabanlı auth kontrolü (throw’lu):
 *  - x-authenticated: "true" | "1" | "yes" → zorunlu
 *  - x-user-id: (opsiyonel)
 *  - x-user-permissions: "admin,editor" (opsiyonel, virgülle ayrılmış)
 */
export const authenticatedMiddleware = (
	req: IAuthenticatedRequest,
	_res: Response,
	next: NextFunction
) => {
	const isAuthHeader = String(req.headers['x-authenticated'] ?? '')
		.trim()
		.toLowerCase();
	const isAuthenticated =
		isAuthHeader === 'true' ||
		isAuthHeader === '1' ||
		isAuthHeader === 'yes' ||
		isAuthHeader === 'y';

	if (!isAuthenticated) {
		// 401 → throw (global error handler bunu 401’e map etmeli)
		throw new UnauthorizedException({ message: 'Unauthorized' });
	}

	const userId = (req.headers['x-user-id'] as string) || undefined;
	const permsHeader = (req.headers['x-user-permissions'] as string) || '';
	const permissions = permsHeader
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	// isteğe bağlı: request'e enjekte et
	req.authenticated = true;
	(req as any).user = { id: userId, permissions };

	next();
};
