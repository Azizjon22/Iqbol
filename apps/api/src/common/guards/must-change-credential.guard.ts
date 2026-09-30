import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SKIP_MUST_CHANGE_KEY } from '../decorators/skip-must-change.decorator';
import { AuthPayload } from '../types/auth-payload';

/**
 * Blocks every route for a session whose credential was assigned by
 * someone else (mustChangePassword / mustChangePin) until it sets its own,
 * so the person who assigned it stops knowing the live password — and
 * can't be the one quietly using the account afterwards.
 */
@Injectable()
export class MustChangeCredentialGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_MUST_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skip) return true;

    const user: AuthPayload | undefined = context.switchToHttp().getRequest()
      .user;
    if (!user) return true;

    const mustChange =
      (user.kind === 'STAFF' && user.mustChangePassword) ||
      (user.kind === 'WORKER' && user.mustChangePin);
    if (!mustChange) return true;

    throw new ForbiddenException({
      message: 'Avval parolni/PIN kodni yangilashingiz kerak',
      code: 'MUST_CHANGE_CREDENTIAL',
    });
  }
}
