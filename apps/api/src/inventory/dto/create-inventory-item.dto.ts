import { InventoryCategory, ProductCategory, Unit } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  Max,
} from 'class-validator';
import { IsMediaUrl } from '../../common/validators/is-media-url';

export class CreateInventoryItemDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @IsOptional()
  @IsEnum(ProductCategory)
  productCategory?: ProductCategory;

  @IsOptional()
  @IsMediaUrl()
  photoUrl?: string;

  @IsEnum(Unit)
  unit!: Unit;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100_000_000, { message: 'Miqdor juda katta' })
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100_000_000, { message: 'Miqdor juda katta' })
  minThreshold?: number;
}
