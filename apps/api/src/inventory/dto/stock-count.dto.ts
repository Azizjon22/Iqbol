import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

/** Stocktake: the quantity actually counted on the shelf. */
export class StockCountDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100_000_000, { message: 'Miqdor juda katta' })
  actual!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
