import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, Min, Max } from 'class-validator';

/**
 * At the bazaar staff usually know what they paid in total, not per kg —
 * so either price may be sent (the other is derived). `quantity` is what
 * was actually bought when it differs from the list.
 */
export class MarkPurchasedDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000, { message: 'Narx juda katta' })
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(99_999_999_999, { message: 'Summa juda katta' })
  totalPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(1_000_000, { message: 'Miqdor juda katta' })
  quantity?: number;
}

export class UpdateItemPriceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000, { message: 'Narx juda katta' })
  unitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(99_999_999_999, { message: 'Summa juda katta' })
  totalPrice?: number;
}
