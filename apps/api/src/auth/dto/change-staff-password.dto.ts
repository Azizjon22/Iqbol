import { IsString, MinLength } from 'class-validator';

export class ChangeStaffPasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8, {
    message: "Yangi parol kamida 8 belgidan iborat bo'lishi kerak",
  })
  newPassword!: string;
}
