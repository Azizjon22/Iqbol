import { IsString, MinLength } from 'class-validator';

export class ChangeStaffPasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(6, { message: "Yangi parol kamida 6 belgidan iborat bo'lishi kerak" })
  newPassword!: string;
}
