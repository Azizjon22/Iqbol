import { EventExpenseCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateEventExpenseDto {
  @IsEnum(EventExpenseCategory)
  category!: EventExpenseCategory;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
