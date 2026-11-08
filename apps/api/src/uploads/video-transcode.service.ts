import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';

/** Anything short of this on its shorter edge gets scaled up — not invented
 * detail, just a cleaner resize than what the browser does by stretching a
 * <video> element. True 4K upscaling of soft source footage would just make
 * a bigger soft file, so 1080p is the honest ceiling here. */
const MIN_EDGE = 1080;

export interface VideoProbe {
  codec: string;
  width: number;
  height: number;
}

/** Shells out to ffprobe/ffmpeg — both must be on PATH. */
@Injectable()
export class VideoTranscodeService {
  private readonly logger = new Logger(VideoTranscodeService.name);

  async probe(absolutePath: string): Promise<VideoProbe | null> {
    try {
      const out = await this.run('ffprobe', [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=codec_name,width,height',
        '-of',
        'csv=p=0',
        absolutePath,
      ]);
      const [codec, width, height] = out.trim().split(',');
      if (!codec || !width || !height) return null;
      return {
        codec: codec.toLowerCase(),
        width: Number(width),
        height: Number(height),
      };
    } catch (error) {
      this.logger.warn(`ffprobe failed for ${absolutePath}: ${String(error)}`);
      return null;
    }
  }

  /** True when the codec isn't browser-safe H.264, or the short edge is below MIN_EDGE. */
  needsProcessing(probe: VideoProbe): boolean {
    return (
      probe.codec !== 'h264' || Math.min(probe.width, probe.height) < MIN_EDGE
    );
  }

  private upscaleFilter(probe: VideoProbe): string | null {
    const shortEdge = Math.min(probe.width, probe.height);
    if (shortEdge >= MIN_EDGE) return null;
    const factor = MIN_EDGE / shortEdge;
    // Even dimensions — libx264's yuv420p requires it. A light unsharp pass
    // after the Lanczos resize counters the softness resizing introduces.
    const w = 2 * Math.round((probe.width * factor) / 2);
    const h = 2 * Math.round((probe.height * factor) / 2);
    return `scale=${w}:${h}:flags=lanczos,unsharp=5:5:0.6:5:5:0.0`;
  }

  async transcodeToH264(
    inputPath: string,
    outputPath: string,
    probe: VideoProbe,
  ): Promise<void> {
    const filter = this.upscaleFilter(probe);
    const args = [
      '-y',
      '-i',
      inputPath,
      ...(filter ? ['-vf', filter] : []),
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      // 8-bit 4:2:0 is the only H.264 flavour every browser and phone plays;
      // without this an iPhone's 10-bit HDR clip stays 10-bit and won't play.
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outputPath,
    ];
    await this.run('ffmpeg', args);
  }

  private run(cmd: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args);
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
      child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
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
