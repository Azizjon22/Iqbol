import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, stat, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import { VideoTranscodeService } from './video-transcode.service';

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

const FOLDERS = ['workers', 'menus', 'inventory', 'branding'] as const;
type UploadFolder = (typeof FOLDERS)[number];

const IMAGE_MAX_BYTES = 80 * 1024 * 1024;
const VIDEO_MAX_BYTES = 200 * 1024 * 1024;

interface UploadToken {
  purpose: 'upload';
  key: string;
  contentType: string;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private client: S3Client | null = null;

  constructor(
    private config: ConfigService,
    private jwt: JwtService,
    private transcode: VideoTranscodeService,
  ) {}

  /** Empty S3 settings mean files are stored on disk. */
  private useLocal(): boolean {
    return !this.config.get<string>('S3_ENDPOINT')?.trim();
  }

  private uploadsRoot(): string {
    return path.resolve(process.cwd(), 'uploads');
  }

  private assertKey(key: string): string {
    const normalized = key.replace(/\\/g, '/');
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      throw new BadRequestException("Fayl yo'li noto'g'ri");
    }
    const match = /^([a-z]+)\/([0-9a-f-]{36})\.([a-z0-9]+)$/.exec(normalized);
    if (
      !match ||
      !FOLDERS.includes(match[1] as UploadFolder) ||
      !EXTENSION_CONTENT_TYPES[match[3]]
    ) {
      throw new BadRequestException("Fayl yo'li noto'g'ri");
    }
    const root = this.uploadsRoot();
    const absolute = path.resolve(root, normalized);
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
    if (!absolute.toLowerCase().startsWith(rootWithSep.toLowerCase())) {
      throw new BadRequestException("Fayl yo'li noto'g'ri");
    }
    return absolute;
  }

  async presign(folder: UploadFolder, contentType: string) {
    const extension = ALLOWED_CONTENT_TYPES[contentType];
    if (!extension) {
      throw new BadRequestException("Fayl turi qo'llab-quvvatlanmaydi");
    }

    const key = `${folder}/${randomUUID()}.${extension}`;

    if (this.useLocal()) {
      const token = this.jwt.sign(
        { purpose: 'upload', key, contentType } satisfies UploadToken,
        {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: '5m',
        },
      );
      return {
        uploadUrl: `/api/uploads/local?token=${encodeURIComponent(token)}`,
        publicUrl: `/uploads/${key}`,
        key,
      };
    }

    const uploadUrl = await getSignedUrl(
      this.s3(),
      new PutObjectCommand({
        Bucket: this.config.getOrThrow<string>('S3_BUCKET'),
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );

    const publicBase = this.config.getOrThrow<string>('S3_PUBLIC_BASE_URL');
    const publicUrl = `${publicBase.replace(/\/$/, '')}/${key}`;
    return { uploadUrl, publicUrl, key };
  }

  async saveLocal(
    token: string | undefined,
    contentTypeHeader: string | undefined,
    body: Buffer,
  ) {
    if (!token) throw new UnauthorizedException('Yuklash havolasi eskirgan');
    if (!this.useLocal()) {
      throw new BadRequestException("Lokal yuklash o'chiq");
    }

    let payload: UploadToken;
    try {
      payload = this.jwt.verify<UploadToken>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Yuklash havolasi eskirgan');
    }
    if (payload.purpose !== 'upload' || !payload.key || !payload.contentType) {
      throw new UnauthorizedException('Yuklash havolasi eskirgan');
    }

    const contentType = (contentTypeHeader ?? '').split(';')[0].trim();
    if (contentType !== payload.contentType) {
      throw new BadRequestException('Fayl turi mos kelmaydi');
    }
    if (body.length === 0) throw new BadRequestException("Fayl bo'sh");
    const video = contentType.startsWith('video/');
    const maxBytes = video ? VIDEO_MAX_BYTES : IMAGE_MAX_BYTES;
    if (body.length > maxBytes) {
      throw new PayloadTooLargeException(
        video ? 'Video 200 MB dan katta' : 'Fayl 80 MB dan katta',
      );
    }

    const absolute = this.assertKey(payload.key);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, body);
    return { ok: true };
  }

  async openLocal(key: string) {
    const absolute = this.assertKey(key);
    const extension = path.extname(absolute).slice(1).toLowerCase();
    const type = EXTENSION_CONTENT_TYPES[extension];
    if (!type) throw new NotFoundException('Fayl topilmadi');
    try {
      const info = await stat(absolute);
      if (!info.isFile()) throw new NotFoundException('Fayl topilmadi');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('Fayl topilmadi');
    }
    return { absolute, type };
  }

  /**
   * Makes an uploaded video play everywhere, start at once and run smoothly:
   * see VideoTranscodeService.plan for when the picture is left untouched.
   *
   * Returns false when nothing needs doing (not a local upload, or already
   * ideal) — the caller leaves its row READY. Otherwise the work runs in the
   * background, the caller marks its row PROCESSING, and `onDone` is called
   * with the new address, or a failure, once it settles. The original is
   * kept until its replacement is complete.
   */
  async prepareVideo(
    publicUrl: string,
    onDone: (
      result: { ok: true; url: string } | { ok: false },
    ) => Promise<unknown>,
  ): Promise<boolean> {
    const match = /^\/uploads\/(.+)$/.exec(publicUrl);
    if (!match) return false; // S3 or an outside address: not ours to rewrite

    let inputPath: string;
    try {
      inputPath = this.assertKey(match[1]);
    } catch {
      return false;
    }
    const probe = await this.transcode.probe(inputPath);
    if (!probe) return false;
    const plan = await this.transcode.plan(inputPath, probe);
    if (plan.action === 'keep') return false;

    // Always a fresh name: ffmpeg cannot write over its own input, and a new
    // address also means no browser keeps showing a cached old copy.
    const newKey = `${match[1].split('/')[0]}/${randomUUID()}.mp4`;
    const outputPath = this.assertKey(newKey);
    const work =
      plan.action === 'remux'
        ? this.transcode.remux(inputPath, outputPath)
        : this.transcode.transcode(inputPath, outputPath, plan.scale);

    work
      .then(async () => {
        await onDone({ ok: true, url: `/uploads/${newKey}` });
        await unlink(inputPath).catch(() => undefined);
      })
      .catch(async (error: unknown) => {
        this.logger.error(
          `Video ${plan.action} failed for ${inputPath}: ${String(error)}`,
        );
        await unlink(outputPath).catch(() => undefined);
        await Promise.resolve(onDone({ ok: false })).catch(() => undefined);
      });

    return true;
  }

  private s3(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        region: this.config.get<string>('S3_REGION', 'auto'),
        endpoint: this.config.getOrThrow<string>('S3_ENDPOINT'),
        credentials: {
          accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
          secretAccessKey: this.config.getOrThrow<string>(
            'S3_SECRET_ACCESS_KEY',
          ),
        },
      });
    }
    return this.client;
  }
}
