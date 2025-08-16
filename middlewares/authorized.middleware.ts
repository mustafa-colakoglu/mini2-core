import { NextFunction, Request, Response } from 'express';
import { ForbiddenException } from '../expections/http.expection';

/** Header tabanlı yetkilendirme (throw’lu):
 *  - required: gerekli permission listesi
 *  - Mevcut izinler önce req.user.permissions’tan,
 *    yoksa x-user-permissions header’ından alınır.
 */
export const authorizedMiddleware = (required: string[]) => {
  return (
    req: Request & { user?: { permissions?: string[] } },
    _res: Response,
    next: NextFunction
  ) => {
    const fromReq = req.user?.permissions ?? [];
    const fromHeader = String(req.headers['x-user-permissions'] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const current = new Set<string>([...fromReq, ...fromHeader]);
    const ok = required.length === 0 || required.some((perm) => current.has(perm));

    if (!ok) {
      // 403 → throw (global error handler bunu 403’e map etmeli)
      throw new ForbiddenException({ message: 'Forbidden' });
    }

    next();
  };
};