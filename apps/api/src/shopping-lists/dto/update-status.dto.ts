import { ShoppingListStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateShoppingListStatusDto {
  @IsEnum(ShoppingListStatus)
  status!: ShoppingListStatus;

  /**
   * Closing locks the prices for good, so every line must have been ticked
   * off in the confirmation step — the ids of the lines that were.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @IsString({ each: true })
  confirmedItemIds?: string[];
}
