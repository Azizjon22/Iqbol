import {
  Body,
  Controller,
  Get,
  PayloadTooLargeException,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipMustChange } from '../common/decorators/skip-must-change.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadsService } from './uploads.service';
import { PresignDto, StaffPresignDto } from './dto/presign.dto';

const MAX_BYTES = 200 * 1024 * 1024;

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
  async serve(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const range = Array.isArray(req.headers.range) ? req.headers.range[0] : req.headers.range;
    const opened = await this.uploads.openLocal(keyFromRequest(req), range);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', opened.type);
    if (opened.status === 416 || !opened.stream) {
      res.status(416);
      res.setHeader('Content-Range', `bytes */${opened.size}`);
      res.setHeader('Content-Length', '0');
      return;
    }
    const length = opened.end - opened.start + 1;
    res.status(opened.status);
    res.setHeader('Content-Length', String(length));
    if (opened.status === 206) {
      res.setHeader('Content-Range', `bytes ${opened.start}-${opened.end}/${opened.size}`);
    }
    return new StreamableFile(opened.stream, {
      type: opened.type,
      disposition: 'inline',
      length,
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
      return Promise.reject(new PayloadTooLargeException('Video 200 MB dan katta'));
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
        fail(new PayloadTooLargeException('Video 200 MB dan katta'));
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
