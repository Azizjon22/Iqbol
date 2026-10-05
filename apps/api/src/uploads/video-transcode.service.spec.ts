import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { VideoProbe, VideoTranscodeService } from './video-transcode.service';

/** A file that is only MP4 box headers: enough for the index-position check. */
function boxes(...types: string[]) {
  return Buffer.concat(
    types.map((type) => {
      const box = Buffer.alloc(16);
      box.writeUInt32BE(16, 0);
      box.write(type, 4, 'latin1');
      return box;
    }),
  );
}

const ideal: VideoProbe = {
  codec: 'h264',
  width: 1920,
  height: 1080,
  pixelFormat: 'yuv420p',
  bitrate: 6_000_000,
  peakBitrate: 9_000_000,
  rotated: false,
};

describe('VideoTranscodeService.plan', () => {
  const service = new VideoTranscodeService();
  let dir: string;
  let indexFirst: string;
  let indexLast: string;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'iqbol-video-'));
    indexFirst = path.join(dir, 'first.mp4');
    indexLast = path.join(dir, 'last.mp4');
    await writeFile(indexFirst, boxes('ftyp', 'moov', 'mdat'));
    await writeFile(indexLast, boxes('ftyp', 'mdat', 'moov'));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it('leaves an already ideal clip exactly as uploaded', async () => {
    expect(await service.plan(indexFirst, ideal)).toEqual({ action: 'keep' });
  });

  it('only repacks a good clip whose index sits at the end', async () => {
    expect(await service.plan(indexLast, ideal)).toEqual({ action: 'remux' });
  });

  it("re-encodes an iPhone's HEVC clip", async () => {
    const plan = await service.plan(indexFirst, { ...ideal, codec: 'hevc' });
    expect(plan).toEqual({ action: 'transcode', scale: null });
  });

  it('re-encodes 10-bit H.264, which most browsers refuse', async () => {
    const plan = await service.plan(indexFirst, {
      ...ideal,
      pixelFormat: 'yuv420p10le',
    });
    expect(plan.action).toBe('transcode');
  });

  it('brings 4K down to 1080p, keeping the shape', async () => {
    const plan = await service.plan(indexFirst, {
      ...ideal,
      width: 3840,
      height: 2160,
    });
    expect(plan).toEqual({
      action: 'transcode',
      scale: 'scale=-2:1080:flags=lanczos',
    });
  });

  it('scales a tall phone clip by its width', async () => {
    const plan = await service.plan(indexFirst, {
      ...ideal,
      width: 2160,
      height: 3840,
    });
    expect(plan).toEqual({
      action: 'transcode',
      scale: 'scale=1080:-2:flags=lanczos',
    });
  });

  it('treats sideways footage with a rotation flag as tall', async () => {
    const plan = await service.plan(indexFirst, {
      ...ideal,
      width: 3840,
      height: 2160,
      rotated: true,
    });
    expect(plan).toEqual({
      action: 'transcode',
      scale: 'scale=1080:-2:flags=lanczos',
    });
  });

  it('never scales a small clip up', async () => {
    const plan = await service.plan(indexFirst, {
      ...ideal,
      width: 1280,
      height: 720,
    });
    expect(plan).toEqual({ action: 'keep' });
  });

  it('re-encodes a clip too heavy to play without pausing', async () => {
    const plan = await service.plan(indexFirst, {
      ...ideal,
      bitrate: 30_000_000,
    });
    expect(plan).toEqual({ action: 'transcode', scale: null });
  });

  it('re-encodes a clip with one very heavy second, despite a modest average', async () => {
    const plan = await service.plan(indexFirst, {
      ...ideal,
      peakBitrate: 68_000_000,
    });
    expect(plan.action).toBe('transcode');
  });
});
