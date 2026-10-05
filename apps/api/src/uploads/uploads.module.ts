import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { VideoTranscodeService } from './video-transcode.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [UploadsController],
  providers: [UploadsService, VideoTranscodeService],
  exports: [UploadsService],
})
export class UploadsModule {}
