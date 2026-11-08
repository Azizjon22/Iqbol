import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthPayload } from '../types/auth-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * Beyond the signature/expiry check passport-jwt already did: reject a
   * token whose account was deactivated/rejected, or whose tokenVersion no
   * longer matches the database — bumped on password/PIN change or admin
   * deactivation, so those take effect immediately instead of waiting for
   * this access token's own 15-minute expiry.
   */
  async validate(payload: AuthPayload): Promise<AuthPayload> {
    if (payload.kind === 'STAFF') {
      const staff = await this.prisma.staffUser.findUnique({
        where: { id: payload.sub },
      });
      if (
        !staff ||
        !staff.isActive ||
        staff.tokenVersion !== payload.tokenVersion
      ) {
        throw new UnauthorizedException('Sessiya endi amal qilmaydi');
      }
    } else {
      const worker = await this.prisma.worker.findUnique({
        where: { id: payload.sub },
      });
      if (
        !worker ||
        worker.status !== 'APPROVED' ||
        worker.position !== 'CHEF' ||
        worker.tokenVersion !== payload.tokenVersion
      ) {
        throw new UnauthorizedException('Sessiya endi amal qilmaydi');
      }
      return { ...payload, position: worker.position };
    }
    return payload;
  }
}
