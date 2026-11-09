import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { ErrorAlertsService } from './error-alerts.service';

class ClientErrorDto {
  @IsString()
  @MaxLength(1000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;
}

/** Browser errors, passed on by the web app's error pages. */
@Controller('client-errors')
export class ClientErrorsController {
  constructor(private alerts: ErrorAlertsService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post()
  report(@Body() dto: ClientErrorDto) {
    this.alerts.reportClient(dto);
  }
}
