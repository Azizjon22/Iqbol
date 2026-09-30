import { Type } from 'class-transformer';
import { Unit } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ShoppingListItemInput {
  @IsString()
  @MinLength(2)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsEnum(Unit)
  unit!: Unit;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateShoppingListDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShoppingListItemInput)
  items!: ShoppingListItemInput[];
}
