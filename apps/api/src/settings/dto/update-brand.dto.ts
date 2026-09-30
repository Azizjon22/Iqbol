import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsMediaUrl } from '../../common/validators/is-media-url';

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  brandName?: string;

  /** null resets to the default letter mark. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMediaUrl()
  logoUrl?: string | null;

  /** null restores the menu-cover backdrop on the package list. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMediaUrl()
  heroMediaUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsIn(['IMAGE', 'VIDEO'])
  heroMediaKind?: 'IMAGE' | 'VIDEO' | null;
}
