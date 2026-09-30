import { IsOptional, IsString } from 'class-validator';

export class AssignWorkerDto {
  @IsString()
  workerId!: string;

  @IsOptional()
  @IsString()
  roleAtEvent?: string;
}
