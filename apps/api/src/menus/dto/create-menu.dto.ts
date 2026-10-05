import { Type } from 'class-transformer';
import { IsMediaUrl } from '../../common/validators/is-media-url';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  IsPositive,
  Max,
} from 'class-validator';

export class CreateMenuDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: "Narx 0 dan katta bo'lishi kerak" })
  @Max(100_000_000, { message: 'Narx juda katta' })
  pricePerPerson!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000, { message: 'Mehmonlar soni 2000 tadan oshmasligi kerak' })
  guestCount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMediaUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isVip?: boolean;
}
