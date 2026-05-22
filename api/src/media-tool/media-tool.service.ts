import * as path from 'path';

import { Injectable } from '@nestjs/common';

import { MissingVideoStreamException } from './exceptions';

import { ClipBoundary, Ffmpeg } from '@/lib/ffmpeg/ffmpeg';
import { FSHelper } from '@/lib/fs-helper';
import { PathHelper } from '@/lib/path-helper';

export interface VideoMetainfo {
  width: number;
  height: number;
  bitrate: number;
  duration: number;
}

export interface GenerateAssetsProps {
  previewTimepoint: number;
  assetPrefix: string;
  overwrite: boolean;
}

@Injectable()
export class MediaToolService {
  async videoMetainfo(filename: string): Promise<VideoMetainfo> {
    const metainfo = await Ffmpeg.videoMetadata(
      path.join(PathHelper.mediaEntry, filename)
    );

    const stream = metainfo.streams[0];
    if (stream === undefined) {
      throw new MissingVideoStreamException();
    }

    return {
      width: stream.width,
      height: stream.height,
      bitrate: Number.parseInt(stream.bit_rate),
      duration: Number.parseFloat(stream.duration)
    };
  }

  /**
   *
   * @param filename
   * @returns true if all assets generated successfully
   */
  async generateAssets(
    filename: string,
    props: GenerateAssetsProps
  ): Promise<boolean> {
    return (
      (await this.generatePreview(filename, props)) &&
      (await this.generateTrailer(filename)) &&
      (await this.generateScrubbingStrip(filename, props))
    );
  }

  async generatePreview(
    source: string,
    props: GenerateAssetsProps
  ): Promise<boolean> {
    const dest = path.join(PathHelper.previewEntry, `${props.assetPrefix}.jpg`);

    if (!props.overwrite && (await FSHelper.exists(dest))) {
      return true;
    }

    return Ffmpeg.generatePreview(
      path.join(PathHelper.mediaEntry, source),
      props.previewTimepoint,
      dest,
      { overwrite: true }
    );
  }

  async generateTrailer(src: string): Promise<boolean> {
    return true;
  }

  async generateScrubbingStrip(
    source: string,
    props: GenerateAssetsProps
  ): Promise<boolean> {
    const dest = path.join(
      PathHelper.scrubbingEntry,
      `${props.assetPrefix}.jpg`
    );

    if (!props.overwrite && (await FSHelper.exists(dest))) {
      return true;
    }

    return Ffmpeg.generateScrubbingStrip(
      path.join(PathHelper.mediaEntry, source),
      { stripWidth: 32768, tiles: 128 },
      dest,
      { overwrite: true }
    );
  }

  async makeClip(
    src: string,
    boundary: ClipBoundary,
    dest: string
  ): Promise<boolean> {
    return Ffmpeg.makeClip(src, boundary, dest);
  }
}
