import { MediaType, MenuMediaSection } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMenuMediaDto {
  @IsEnum(MenuMediaSection)
  section!: MenuMediaSection;

  @IsEnum(MediaType)
  mediaType!: MediaType;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
