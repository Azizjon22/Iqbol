import { InventoryTxnType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateTransactionDto {
  @IsEnum(InventoryTxnType)
  type!: InventoryTxnType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;

  /** Price per unit of a kirim. Honoured for the super admin only. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  unitPrice?: number;
}
