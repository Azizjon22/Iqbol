import {
  Body,
  Controller,
  Get,
  PayloadTooLargeException,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipMustChange } from '../common/decorators/skip-must-change.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadsService } from './uploads.service';
import { PresignDto, StaffPresignDto } from './dto/presign.dto';

const MAX_BYTES = 80 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('worker-photo-presign')
  presignWorkerPhoto(@Body() dto: PresignDto) {
    return this.uploads.presign('workers', dto.contentType);
  }

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('presign')
  presign(@Body() dto: StaffPresignDto) {
    return this.uploads.presign(dto.folder, dto.contentType);
  }

  @Public()
  @SkipMustChange()
  @Put('local')
  async saveLocal(@Query('token') token: string | undefined, @Req() req: Request) {
    const body = await readLimited(req, MAX_BYTES);
    const contentType = req.headers['content-type'];
    return this.uploads.saveLocal(token, typeof contentType === 'string' ? contentType : undefined, body);
  }

  @Public()
  @SkipMustChange()
  @SkipThrottle()
  @Get('files/*')
  async serve(@Req() req: Request) {
    const opened = await this.uploads.openLocal(keyFromRequest(req));
    return new StreamableFile(opened.stream, {
      type: opened.type,
      disposition: 'inline',
    });
  }
}

function keyFromRequest(req: Request): string {
  const raw = req.originalUrl.split('?')[0];
  const marker = '/uploads/files/';
  const index = raw.indexOf(marker);
  if (index === -1) return '';
  return decodeURIComponent(raw.slice(index + marker.length));
}

function readLimited(req: Request, maxBytes: number): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > maxBytes) {
      return Promise.reject(new PayloadTooLargeException('Fayl 80 MB dan katta'));
    }
    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > maxBytes) {
        fail(new PayloadTooLargeException('Fayl 80 MB dan katta'));
        req.destroy();
        return;
      }
      chunks.push(buf);
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (error) => {
      if ((error as NodeJS.ErrnoException).code === 'ERR_STREAM_PREMATURE_CLOSE') return;
      fail(error);
    });
  });
}
