import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { open } from 'node:fs/promises';

/**
 * What screens and phones play without pausing, even on an ordinary mobile
 * connection: 1080p at up to 8 Mbit/s — what YouTube spends on the same
 * picture. A phone's 4K clip runs 40–50 Mbit/s; that is what stutters.
 */
const MAX_SHORT_EDGE = 1080;
const MAX_BITRATE = 8_000_000;
/** Above this a clip is re-encoded even when its codec is fine. */
const SMOOTH_BITRATE = 12_000_000;
/**
 * …and so is one whose heaviest single second is above this, however modest
 * its average: that second is where playback would stop to buffer.
 */
const SMOOTH_PEAK_BITRATE = 20_000_000;

export interface VideoProbe {
  codec: string;
  width: number;
  height: number;
  /** 8-bit 4:2:0 is the only H.264 flavour every browser and phone plays. */
  pixelFormat: string;
  /** Bits per second, 0 when the container does not say. */
  bitrate: number;
  /** Bits in the heaviest one-second stretch of the clip. */
  peakBitrate: number;
  /** Sideways phone footage reports its size before rotation. */
  rotated: boolean;
}

export type VideoPlan =
  /** Already ideal: served as uploaded, bit for bit. */
  | { action: 'keep' }
  /** Right codec, but the index sits at the end: repacked without re-encoding. */
  | { action: 'remux' }
  /** Wrong codec, too large or too heavy: re-encoded once, at high quality. */
  | { action: 'transcode'; scale: string | null };

/** Shells out to ffprobe/ffmpeg — both must be on PATH. */
@Injectable()
export class VideoTranscodeService {
  private readonly logger = new Logger(VideoTranscodeService.name);
  /** One video at a time: two encodes at once would starve the site itself. */
  private queue: Promise<unknown> = Promise.resolve();

  async probe(absolutePath: string): Promise<VideoProbe | null> {
    try {
      const out = await this.run('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=codec_name,width,height,pix_fmt,bit_rate:stream_side_data=rotation:format=bit_rate',
        '-of',
        'json',
        absolutePath,
      ]);
      const data = JSON.parse(out) as {
        streams?: {
          codec_name?: string;
          width?: number;
          height?: number;
          pix_fmt?: string;
          bit_rate?: string;
          side_data_list?: { rotation?: number }[];
        }[];
        format?: { bit_rate?: string };
      };
      const stream = data.streams?.[0];
      if (!stream?.codec_name || !stream.width || !stream.height) return null;
      const rotation = Math.abs(
        stream.side_data_list?.find((s) => s.rotation !== undefined)
          ?.rotation ?? 0,
      );
      return {
        codec: stream.codec_name.toLowerCase(),
        width: stream.width,
        height: stream.height,
        pixelFormat: stream.pix_fmt ?? '',
        bitrate: Number(stream.bit_rate ?? data.format?.bit_rate ?? 0) || 0,
        peakBitrate: await this.peakBitrate(absolutePath),
        rotated: rotation === 90 || rotation === 270,
      };
    } catch (error) {
      this.logger.warn(`ffprobe failed for ${absolutePath}: ${String(error)}`);
      return null;
    }
  }

  /**
   * The busiest second of the video stream, in bits. Reads only the packet
   * index, so it is quick even for a long clip.
   */
  private async peakBitrate(absolutePath: string): Promise<number> {
    try {
      const out = await this.run('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'packet=pts_time,size',
        '-of',
        'csv=p=0',
        absolutePath,
      ]);
      const perSecond = new Map<number, number>();
      for (const line of out.split('\n')) {
        const [time, size] = line.split(',');
        const second = Math.floor(Number(time));
        const bytes = Number(size);
        if (!Number.isFinite(second) || !Number.isFinite(bytes)) continue;
        perSecond.set(second, (perSecond.get(second) ?? 0) + bytes);
      }
      return Math.max(0, ...perSecond.values()) * 8;
    } catch {
      return 0;
    }
  }

  /**
   * Quality first: a clip is only re-encoded when it would not play
   * everywhere or would not play smoothly. Never scaled up — that invents no
   * detail, it only makes a bigger file.
   */
  async plan(absolutePath: string, probe: VideoProbe): Promise<VideoPlan> {
    const shortEdge = Math.min(probe.width, probe.height);
    const playsEverywhere =
      probe.codec === 'h264' &&
      (probe.pixelFormat === 'yuv420p' || probe.pixelFormat === 'yuvj420p');
    const tooLarge = shortEdge > MAX_SHORT_EDGE;
    const tooHeavy =
      probe.bitrate > SMOOTH_BITRATE || probe.peakBitrate > SMOOTH_PEAK_BITRATE;

    if (!playsEverywhere || tooLarge || tooHeavy) {
      return {
        action: 'transcode',
        scale: tooLarge ? this.downscale(probe) : null,
      };
    }
    return (await this.startsWithIndex(absolutePath))
      ? { action: 'keep' }
      : { action: 'remux' };
  }

  /** Fits the short edge to 1080, keeping the shape; libx264 needs even sizes. */
  private downscale(probe: VideoProbe): string {
    // ffmpeg applies the rotation before this filter, so compare what the
    // viewer actually sees.
    const landscape = probe.rotated
      ? probe.height >= probe.width
      : probe.width >= probe.height;
    return landscape
      ? `scale=-2:${MAX_SHORT_EDGE}:flags=lanczos`
      : `scale=${MAX_SHORT_EDGE}:-2:flags=lanczos`;
  }

  /**
   * True when the MP4 index ("moov") comes before the media ("mdat"), so a
   * browser can start playing after the first few kilobytes instead of
   * downloading the whole file first.
   */
  private async startsWithIndex(absolutePath: string): Promise<boolean> {
    const file = await open(absolutePath, 'r');
    try {
      const header = Buffer.alloc(16);
      let offset = 0;
      for (let box = 0; box < 16; box++) {
        const { bytesRead } = await file.read(header, 0, 16, offset);
        if (bytesRead < 8) return false;
        let size = header.readUInt32BE(0);
        const type = header.toString('latin1', 4, 8);
        if (type === 'moov') return true;
        if (type === 'mdat') return false;
        if (size === 1) size = Number(header.readBigUInt64BE(8));
        if (size < 8) return false;
        offset += size;
      }
      return false;
    } catch {
      return false;
    } finally {
      await file.close();
    }
  }

  /** Repacks with the index first. No re-encoding: the picture is untouched. */
  remux(inputPath: string, outputPath: string): Promise<void> {
    return this.enqueue(() =>
      this.run('ffmpeg', [
        '-y',
        '-i',
        inputPath,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        '-c',
        'copy',
        '-movflags',
        '+faststart',
        outputPath,
      ]),
    );
  }

  transcode(
    inputPath: string,
    outputPath: string,
    scale: string | null,
  ): Promise<void> {
    return this.enqueue(() =>
      this.run('ffmpeg', [
        '-y',
        '-i',
        inputPath,
        '-map',
        '0:v:0',
        '-map',
        '0:a:0?',
        ...(scale ? ['-vf', scale] : []),
        '-c:v',
        'libx264',
        '-profile:v',
        'high',
        // CRF 19 is visually indistinguishable from the source; the cap only
        // bites on very busy footage, to keep playback from pausing.
        '-preset',
        'medium',
        '-crf',
        '19',
        '-maxrate',
        String(MAX_BITRATE),
        '-bufsize',
        String(MAX_BITRATE * 2),
        // Without this an iPhone's 10-bit HDR clip stays 10-bit and most
        // browsers refuse it.
        '-pix_fmt',
        'yuv420p',
        // A keyframe every two seconds: scrubbing lands quickly.
        '-force_key_frames',
        'expr:gte(t,n_forced*2)',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        outputPath,
      ]),
    );
  }

  private enqueue(job: () => Promise<unknown>): Promise<void> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next.then(() => undefined);
  }

  private run(cmd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
      // ffmpeg narrates on stderr; only the tail matters when it fails.
      child.stderr.on(
        'data',
        (d: Buffer) => (stderr = (stderr + d.toString()).slice(-2000)),
      );
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve(stdout);
        else
          reject(
            new Error(`${cmd} exited with code ${code}: ${stderr.slice(-500)}`),
          );
      });
    });
  }
}
