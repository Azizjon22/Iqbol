import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthPayload } from '../types/auth-payload';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const user: AuthPayload = context.switchToHttp().getRequest().user;
    if (
      !user ||
      user.kind !== 'STAFF' ||
      !user.role ||
      !requiredRoles.includes(user.role)
    ) {
      throw new ForbiddenException("Bu amal uchun ruxsatingiz yo'q");
    }
    return true;
  }
}
