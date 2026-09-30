import { StaffRole } from '@prisma/client';
import { IsEnum, IsString, Matches, MinLength } from 'class-validator';

export class CreateStaffUserDto {
  @IsString()
  @MinLength(3)
  fullName!: string;

  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: "Telefon raqami noto'g'ri" })
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(StaffRole)
  role!: StaffRole;
}
