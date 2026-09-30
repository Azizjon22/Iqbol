import { IsString, Matches } from 'class-validator';

export class ChangeWorkerPinDto {
  @IsString()
  currentPin!: string;

  @IsString()
  @Matches(/^[0-9]{4}$/, { message: "Yangi PIN 4 ta raqamdan iborat bo'lishi kerak" })
  newPin!: string;
}
