import { EventStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateEventStatusDto {
  @IsEnum(EventStatus)
  status!: EventStatus;
}
