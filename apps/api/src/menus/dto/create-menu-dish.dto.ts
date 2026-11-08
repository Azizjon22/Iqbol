import { MenuDishCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsMediaUrl } from '../../common/validators/is-media-url';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateMenuDishDto {
  @IsEnum(MenuDishCategory)
  category!: MenuDishCategory;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  nameRu!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  descriptionRu?: string;

  @IsOptional()
  @IsMediaUrl()
  photoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
