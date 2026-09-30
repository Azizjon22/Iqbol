import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
