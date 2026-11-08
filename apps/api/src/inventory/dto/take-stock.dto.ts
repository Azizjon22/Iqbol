import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class TakeStockItemInput {
  @IsString()
  itemId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;
}

/** What a chef takes from the store for one wedding. */
export class TakeStockDto {
  @IsString()
  eventId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TakeStockItemInput)
  items!: TakeStockItemInput[];
}

export class SetLotPriceDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  unitPrice!: number;
}
