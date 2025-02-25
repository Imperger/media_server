import { spawn } from 'child_process';
import { Transform, TransformCallback } from 'stream';

import { FSHelper } from '../fs-helper';

export interface Disposition {
  default: number;
  dub: number;
  original: number;
  comment: number;
  lyrics: number;
  karaoke: number;
  forced: number;
  hearing_impaired: number;
  visual_impaired: number;
  clean_effects: number;
  attached_pic: number;
  timed_thumbnails: number;
}

export interface Tags {
  language: string;
  handler_name: string;
}

export interface StreamInfo {
  index: number;
  codec_name: string;
  codec_long_name: string;
  profile: string;
  codec_type: string;
  codec_time_base: string;
  codec_tag_string: string;
  codec_tag: string;
  width: number;
  height: number;
  coded_width: number;
  coded_height: number;
  has_b_frames: number;
  pix_fmt: string;
  level: number;
  chroma_location: string;
  refs: number;
  is_avc: string;
  nal_length_size: string;
  r_frame_rate: string;
  avg_frame_rate: string;
  time_base: string;
  start_pts: number;
  start_time: string;
  duration_ts: number;
  duration: string;
  bit_rate: string;
  bits_per_raw_sample: string;
  nb_frames: string;
  disposition: Disposition;
  tags: Tags;
}

export interface VideoMetadata {
  streams: StreamInfo[];
}

export interface FfmpegOptions {
  overwrite?: boolean;
}

export interface ScrubbingStripProps {
  tiles: number;
  stripWidth: number;
}

export type Seconds = number;

export interface ClipBoundary {
  begin: Seconds;
  end: Seconds;
}

class TransformToString extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  public _transform(
    chunk: Buffer,
    encoding: string,
    callback: TransformCallback
  ) {
    callback(null, chunk.toString());
  }
}

export class Ffmpeg {
  static videoMetadata(filename: string): Promise<VideoMetadata> {
    return new Promise(async (resolve, reject) => {
      if (!(await FSHelper.exists(filename))) {
        reject(new Error(`File ${filename} not found.`));
        return;
      }

      const opts = [
        '-loglevel',
        'error',
        '-show_streams',
        '-select_streams',
        'v:0',
        '-print_format',
        'json=compact=1',
        filename
      ];
      const ffprobe = spawn('ffprobe', opts, { detached: true });

      let jsonString = '';
      ffprobe.stdout
        .pipe(new TransformToString())
        .on('data', (data: string) => (jsonString += data));

      ffprobe.stderr
        .pipe(new TransformToString())
        .once('data', (data: string) => reject(new Error(data)));

      ffprobe.once('exit', () => resolve(JSON.parse(jsonString)));
    });
  }

  /**
   *
   * @param source
   * @param timepoint in seconds
   * @param destination
   * @returns
   */
  static async generatePreview(
    source: string,
    timepoint: number,
    destination: string,
    props?: FfmpegOptions
  ): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      const ffmpeg = spawn('ffmpeg', [
        ...Ffmpeg.overwriteProp(props),
        '-loglevel',
        'error',
        '-ss',
        timepoint.toString(),
        '-i',
        source,
        '-vframes',
        '1',
        destination
      ]);
      ffmpeg.once('error', () => resolve(false));
      ffmpeg.once('exit', () => resolve(true));
    });
  }

  /**
   *
   * @param source
   * @param timepoint in seconds
   * @param destination
   * @returns
   */
  static async generateScrubbingStrip(
    source: string,
    options: ScrubbingStripProps,
    destination: string,
    props?: FfmpegOptions
  ): Promise<boolean> {
    const info = (await this.videoMetadata(source)).streams[0];
    const totalFrames = Number.parseInt(info.nb_frames);
    const frameWidth = Math.floor(options.stripWidth / options.tiles);

    return new Promise((resolve, _reject) => {
      const ffmpeg = spawn(
        'ffmpeg',
        [
          ...Ffmpeg.overwriteProp(props),
          '-loglevel',
          'error',
          '-i',
          source,
          '-vframes',
          '1',
          '-vf',
          `select='not(mod(n\,${Math.floor(totalFrames / options.tiles)}))',scale=${frameWidth}:-1,tile=${options.tiles}x1`,
          destination
        ],
        { detached: true }
      );

      ffmpeg.once('error', () => resolve(false));
      ffmpeg.once('exit', () => resolve(true));
    });
  }

  static async makeClip(
    input: string,
    boundary: ClipBoundary,
    output: string,
    props?: FfmpegOptions
  ): Promise<boolean> {
    return new Promise((resolve, _reject) => {
      const ffmpeg = spawn(
        'ffmpeg',
        [
          ...Ffmpeg.overwriteProp(props),
          '-loglevel',
          'error',
          '-ss',
          boundary.begin.toString(),
          '-to',
          boundary.end.toString(),
          '-i',
          input,
          '-c:v',
          'copy',
          '-c:a',
          'copy',
          output
        ],
        { detached: true }
      );

      ffmpeg.once('error', () => resolve(false));
      ffmpeg.once('exit', () => resolve(true));
    });
  }

  private static overwriteProp(props?: FfmpegOptions): string[] {
    return props?.overwrite === true ? ['-y'] : [];
  }
}
