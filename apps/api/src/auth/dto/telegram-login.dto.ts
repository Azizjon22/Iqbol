import { IsString, MaxLength, MinLength } from 'class-validator';

export class TelegramLoginDto {
  /** Telegram.WebApp.initData, exactly as the mini app received it. */
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  initData!: string;
}
