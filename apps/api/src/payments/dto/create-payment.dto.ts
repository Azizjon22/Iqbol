import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';

export class CreatePaymentDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(99_999_999_999, { message: 'Summa juda katta' })
  amount!: number;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  note?: string;
}
