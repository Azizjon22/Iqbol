import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthPayload } from '../types/auth-payload';

function isChef(user?: AuthPayload) {
  return user?.kind === 'WORKER' && user.position === 'CHEF';
}

/**
 * Chef-only routes (the cooking agenda, shopping lists). Waiters also log
 * in as workers, but they have no business in the kitchen's planning.
 */
@Injectable()
export class ChefGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: AuthPayload = context.switchToHttp().getRequest().user;
    if (!isChef(user)) {
      throw new ForbiddenException('Faqat oshpazlar uchun');
    }
    return true;
  }
}

/** Reference data both the office and the kitchen read; waiters do not. */
@Injectable()
export class StaffOrChefGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: AuthPayload = context.switchToHttp().getRequest().user;
    if (user?.kind !== 'STAFF' && !isChef(user)) {
      throw new ForbiddenException("Bu amal uchun ruxsatingiz yo'q");
    }
    return true;
  }
}
