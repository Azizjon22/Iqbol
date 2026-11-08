import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Every browser request reaches this API through the Next.js server's own
 * server-side fetch (apps/web/src/lib/api.ts), so the socket address is the
 * web server's for everyone. Two things keep one user from eating another's
 * allowance:
 *
 * - Login/registration requests carry the account's phone number in the
 *   body — key on that, so each account gets its own bucket.
 * - Everything else keys on the client IP. The web server forwards it in
 *   X-Forwarded-For and TRUST_PROXY (see main.ts) makes `req.ip` honour it.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const phone = req.body?.phone;
    if (typeof phone === 'string' && phone.length > 0) {
      return `phone:${phone}`;
    }
    return super.getTracker(req);
  }
}
