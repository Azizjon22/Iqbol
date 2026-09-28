import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  brandName?: string;

  /** null resets to the default letter mark. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUrl()
  logoUrl?: string | null;
}
