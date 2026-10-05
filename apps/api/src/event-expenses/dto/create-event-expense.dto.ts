import { EventExpenseCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';

export class CreateEventExpenseDto {
  @IsEnum(EventExpenseCategory)
  category!: EventExpenseCategory;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(99_999_999_999, { message: 'Summa juda katta' })
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
