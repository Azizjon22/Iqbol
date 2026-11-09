import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SkipMustChange } from '../common/decorators/skip-must-change.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { TelegramLoginDto } from '../auth/dto/telegram-login.dto';
import { TelegramService } from './telegram.service';

/** The profile's Telegram card — any signed-in account (staff or chef). */
@SkipMustChange()
@Controller('telegram')
export class TelegramController {
  constructor(private telegram: TelegramService) {}

  @Get('status')
  status(@CurrentUser() user: AuthPayload) {
    return this.telegram.status(user);
  }

  /** A one-time t.me link (15 minutes) that links this account in one tap. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('link')
  link(@CurrentUser() user: AuthPayload) {
    return this.telegram.createLink(user);
  }

  @Delete('link')
  unlink(@CurrentUser() user: AuthPayload) {
    return this.telegram.unlinkAccount(user);
  }

  /** A sign-in made inside the mini app links the Telegram user who opened it. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('webapp-link')
  webAppLink(@CurrentUser() user: AuthPayload, @Body() dto: TelegramLoginDto) {
    return this.telegram.linkFromWebApp(user, dto.initData);
  }
}
