import { EventStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class FindEventsQuery {
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
