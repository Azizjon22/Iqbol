import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Every browser request reaches this API through the Next.js server's own
 * server-side fetch (apps/web/src/lib/api.ts) — so the stock IP-keyed
 * ThrottlerGuard sees every real user as the *same* client (the Next.js
 * process's IP), and a shared login limit starts rejecting normal
 * concurrent staff use, not just abuse.
 *
 * Login/registration requests carry the account's phone number in the
 * body — key on that instead so each account gets its own bucket. Every
 * other route (no `phone` in the body) falls back to the default IP key.
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
