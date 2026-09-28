import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
};

@Injectable()
export class UploadsService {
  private client: S3Client;

  constructor(private config: ConfigService) {
    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION', 'auto'),
      endpoint: this.config.getOrThrow<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
    });
  }

  async presign(
    folder: 'workers' | 'menus' | 'inventory' | 'branding',
    contentType: string,
  ) {
    const extension = ALLOWED_CONTENT_TYPES[contentType];
    if (!extension) {
      throw new BadRequestException("Fayl turi qo'llab-quvvatlanmaydi");
    }

    const key = `${folder}/${randomUUID()}.${extension}`;
    const bucket = this.config.getOrThrow<string>('S3_BUCKET');

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );

    const publicBase = this.config.getOrThrow<string>('S3_PUBLIC_BASE_URL');
    const publicUrl = `${publicBase.replace(/\/$/, '')}/${key}`;

    return { uploadUrl, publicUrl, key };
  }
}
