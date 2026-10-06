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
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SkipMustChange } from '../common/decorators/skip-must-change.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadsService } from './uploads.service';
import { StaffPresignDto } from './dto/presign.dto';

const MAX_BYTES = 200 * 1024 * 1024;

@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @Post('presign')
  presign(@Body() dto: StaffPresignDto) {
    return this.uploads.presign(dto.folder, dto.contentType);
  }

  @Public()
  @SkipMustChange()
  @Put('local')
  async saveLocal(
    @Query('token') token: string | undefined,
    @Req() req: Request,
  ) {
    const body = await readLimited(req, MAX_BYTES);
    const contentType = req.headers['content-type'];
    return this.uploads.saveLocal(
      token,
      typeof contentType === 'string' ? contentType : undefined,
      body,
    );
  }

  @Public()
  @SkipMustChange()
  @SkipThrottle()
  @Get('files/*')
  async serve(@Req() req: Request, @Res() res: Response) {
    const opened = await this.uploads.openLocal(keyFromRequest(req));
    // sendFile answers Range requests (206 Partial Content) and conditional
    // GETs: videos start at once and can be scrubbed, and iOS Safari refuses
    // to play video from a server without Range support.
    res.sendFile(
      opened.absolute,
      {
        headers: {
          'Content-Type': opened.type,
          'Content-Disposition': 'inline',
          // Photos and videos are shown on the public presentation pages.
          'Cross-Origin-Resource-Policy': 'cross-origin',
        },
        acceptRanges: true,
        lastModified: true,
        // Every upload gets a random name and is never rewritten, so a
        // browser may keep it for good: the second viewing is instant.
        maxAge: '365d',
        immutable: true,
      },
      (err?: Error & { code?: string; status?: number }) => {
        // A viewer skipping ahead aborts the previous range; that is normal.
        // Otherwise pass on what went wrong (e.g. 416 for a range past the end).
        if (err && err.code !== 'ECONNABORTED' && !res.headersSent)
          res.status(err.status ?? 404).end();
      },
    );
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
      return Promise.reject(
        new PayloadTooLargeException('Video 200 MB dan katta'),
      );
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
      // Once oversized, stop buffering (stay memory-safe) but let the stream
      // keep draining instead of destroying the socket — killing it here
      // would tear down the connection before the 413 answer can be sent,
      // and the uploader would see a bare network error instead of a reason.
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buf.length;
      if (total > maxBytes) {
        chunks.length = 0;
        fail(new PayloadTooLargeException('Video 200 MB dan katta'));
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
      if (
        (error as NodeJS.ErrnoException).code === 'ERR_STREAM_PREMATURE_CLOSE'
      )
        return;
      fail(error);
    });
  });
}
