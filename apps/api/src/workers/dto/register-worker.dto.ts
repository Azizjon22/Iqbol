import { WorkerGender, WorkerPosition } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterWorkerDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: "Telefon raqami noto'g'ri" })
  phone!: string;

  @IsEnum(WorkerPosition)
  position!: WorkerPosition;

  @IsEnum(WorkerGender)
  gender!: WorkerGender;

  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @IsOptional()
  @Matches(/^[0-9]{4}$/, { message: "PIN 4 ta raqamdan iborat bo'lishi kerak" })
  pin?: string;
}
