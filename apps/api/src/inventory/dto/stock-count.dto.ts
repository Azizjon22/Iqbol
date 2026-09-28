import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Stocktake: the quantity actually counted on the shelf. */
export class StockCountDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actual!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
