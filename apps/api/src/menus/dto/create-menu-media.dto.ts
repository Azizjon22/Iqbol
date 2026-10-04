import { MediaType, MenuMediaSection } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { IsMediaUrl } from '../../common/validators/is-media-url';

export class CreateMenuMediaDto {
  @IsEnum(MenuMediaSection)
  section!: MenuMediaSection;

  @IsEnum(MediaType)
  mediaType!: MediaType;

  @IsMediaUrl()
  url!: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}
