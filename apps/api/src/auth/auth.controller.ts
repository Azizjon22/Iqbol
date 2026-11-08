import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { SkipMustChange } from '../common/decorators/skip-must-change.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthPayload } from '../common/types/auth-payload';
import { AuthService } from './auth.service';
import { StaffLoginDto } from './dto/staff-login.dto';
import { WorkerLoginDto } from './dto/worker-login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangeStaffPasswordDto } from './dto/change-staff-password.dto';
import { ChangeWorkerPinDto } from './dto/change-worker-pin.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('staff/login')
  loginStaff(@Body() dto: StaffLoginDto) {
    return this.auth.loginStaff(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('worker/login')
  loginWorker(@Body() dto: WorkerLoginDto) {
    return this.auth.loginWorker(dto);
  }

  /** Sign-in from inside the Telegram mini app. */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('telegram')
  loginTelegram(@Body() dto: TelegramLoginDto) {
    return this.auth.loginTelegram(dto.initData);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @SkipMustChange()
  @Get('me')
  me(@CurrentUser() user: AuthPayload) {
    return this.auth.me(user);
  }

  @SkipMustChange()
  @Patch('staff/password')
  changeStaffPassword(
    @CurrentUser() user: AuthPayload,
    @Body() dto: ChangeStaffPasswordDto,
  ) {
    return this.auth.changeStaffPassword(user, dto);
  }

  @SkipMustChange()
  @Patch('worker/pin')
  changeWorkerPin(
    @CurrentUser() user: AuthPayload,
    @Body() dto: ChangeWorkerPinDto,
  ) {
    return this.auth.changeWorkerPin(user, dto);
  }
}
