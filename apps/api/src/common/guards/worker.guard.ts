import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthPayload } from '../types/auth-payload';

@Injectable()
export class WorkerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user: AuthPayload = context.switchToHttp().getRequest().user;
    if (!user || user.kind !== 'WORKER') {
      throw new ForbiddenException('Faqat ishchilar uchun');
    }
    return true;
  }
}
