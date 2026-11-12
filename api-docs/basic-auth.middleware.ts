import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { ISwaggerBasicAuth } from '../interfaces/config.interface';

function sha256Digest(value: string): Buffer {
	return crypto.createHash('sha256').update(value, 'utf8').digest();
}

function timingSafeEqualString(a: string, b: string): boolean {
	return crypto.timingSafeEqual(sha256Digest(a), sha256Digest(b));
}

export function createBasicAuthMiddleware(
	expected: ISwaggerBasicAuth,
	realm: string,
): (req: Request, res: Response, next: NextFunction) => void {
	return (req: Request, res: Response, next: NextFunction) => {
		const auth = req.headers.authorization;

		if (!auth || !auth.startsWith('Basic ')) {
			res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
			res.status(401).send('Unauthorized');
			return;
		}

		let credentials: string;
		try {
			credentials = Buffer.from(auth.substring(6), 'base64').toString('utf8');
		} catch {
			res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
			res.status(401).send('Unauthorized');
			return;
		}

		const colonIndex = credentials.indexOf(':');
		const username =
			colonIndex >= 0 ? credentials.slice(0, colonIndex) : credentials;
		const password =
			colonIndex >= 0 ? credentials.slice(colonIndex + 1) : '';

		if (
			timingSafeEqualString(username, expected.username) &&
			timingSafeEqualString(password, expected.password)
		) {
			next();
			return;
		}

		res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
		res.status(401).send('Unauthorized');
	};
}
