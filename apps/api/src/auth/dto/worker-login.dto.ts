import { IsString, Matches } from 'class-validator';

export class WorkerLoginDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: "Telefon raqami noto'g'ri" })
  phone!: string;

  @IsString()
  @Matches(/^[0-9]{4}$/, { message: "PIN 4 ta raqamdan iborat bo'lishi kerak" })
  pin!: string;
}
