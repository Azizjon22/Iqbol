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

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMediaUrl()
  photoUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
