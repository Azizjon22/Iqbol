import { ProductCategory, Unit } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsMediaUrl } from '../../common/validators/is-media-url';

/**
 * A product the chef adds to the shopping catalog: a name and a photo. No
 * quantity or price — the store's stock and money stay with the office.
 */
export class ChefProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameRu?: string;

  @IsEnum(Unit)
  unit!: Unit;

  @IsOptional()
  @IsEnum(ProductCategory)
  productCategory?: ProductCategory;

  @IsOptional()
  @IsMediaUrl()
  photoUrl?: string;
}

export class UpdateChefProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nameRu?: string;

  @IsOptional()
  @IsEnum(Unit)
  unit?: Unit;

  @IsOptional()
  @IsEnum(ProductCategory)
  productCategory?: ProductCategory;

  /** "" removes the photo. */
  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @IsMediaUrl()
  photoUrl?: string;
}
