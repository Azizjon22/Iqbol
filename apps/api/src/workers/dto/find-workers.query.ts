import { WorkerGender, WorkerPosition, WorkerStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class FindWorkersQuery {
  @IsOptional()
  @IsEnum(WorkerStatus)
  status?: WorkerStatus;

  @IsOptional()
  @IsEnum(WorkerPosition)
  position?: WorkerPosition;

  @IsOptional()
  @IsEnum(WorkerGender)
  gender?: WorkerGender;
}
