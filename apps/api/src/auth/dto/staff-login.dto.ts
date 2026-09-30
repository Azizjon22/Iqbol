import { IsString, Matches, MinLength } from 'class-validator';

export class StaffLoginDto {
  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: "Telefon raqami noto'g'ri" })
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
