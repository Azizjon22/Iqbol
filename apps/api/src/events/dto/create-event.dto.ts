import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  clientName!: string;

  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: "Telefon raqami noto'g'ri" })
  clientPhone!: string;

  @IsISO8601()
  eventDate!: string;

  @Type(() => Number)
  @IsIn([10, 12])
  tableCapacity!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  guestCount!: number;

  @IsString()
  menuId!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  firstDish?: string;

  @IsOptional()
  @IsString()
  secondDish?: string;
}
