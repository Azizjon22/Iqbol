import { InventoryTxnType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
} from 'class-validator';

export class CreateTransactionDto {
  @IsEnum(InventoryTxnType)
  type!: InventoryTxnType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(100_000_000, { message: 'Miqdor juda katta' })
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
