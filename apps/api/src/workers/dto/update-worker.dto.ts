import { WorkerGender, WorkerPosition } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateWorkerDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: "Telefon raqami noto'g'ri" })
  phone?: string;

  @IsOptional()
  @IsEnum(WorkerPosition)
  position?: WorkerPosition;

  @IsOptional()
  @IsEnum(WorkerGender)
  gender?: WorkerGender;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{4}$/, { message: "PIN 4 ta raqamdan iborat bo'lishi kerak" })
  pin?: string;
}
