import * as path from 'path';
import { PathHelper } from '@/lib/PathHelper';
import { Ffmpeg } from '@/lib/ffmpeg/ffmpeg';
import { Injectable } from '@nestjs/common';
import { MissingVideoStreamException } from './exceptions';

export interface VideoMetainfo {
  width: number;
  height: number;
  duration: number;
}

export interface GenerateAssetsProps {
  previewTimepoint: number;
  assetPrefix: string;
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
      (await this.generateTrailer(filename))
    );
  }

  async generatePreview(
    filename: string,
    props: GenerateAssetsProps
  ): Promise<boolean> {
    return Ffmpeg.generatePreview(
      path.join(PathHelper.mediaEntry, filename),
      props.previewTimepoint,
      path.join(PathHelper.previewEntry, `${props.assetPrefix}.jpg`),
      { overwrite: true }
    );
  }

  async generateTrailer(filename: string): Promise<boolean> {
    return true;
  }
}
