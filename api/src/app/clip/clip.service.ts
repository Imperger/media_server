import * as Path from 'path';

import { Inject, Injectable } from '@nestjs/common';

import { FileAccessService } from '@/file/file-access.service';
import { FolderAccessService } from '@/file/folder-access.service';
import { FolderCollectionService } from '@/folder-collection/folder-collection.service';
import { ClipBoundary } from '@/lib/ffmpeg/ffmpeg';
import { FSHelper } from '@/lib/FSHelper';
import { PathHelper } from '@/lib/PathHelper';
import { MediaToolService } from '@/media-tool/media-tool.service';

export interface FileRecord {
  filename: string;
  size: number;
  width: number;
  height: number;
  duration: number;
  assetPrefix: string;
  createdAt: number;
}

export interface RangeOptions {
  start?: number;
  end?: number;
}

export interface ParsedContentPath {
  collectionIdPath: string;
  relativeFilename: string;
}

@Injectable()
export class ClipService {
  constructor(
    @Inject(FileAccessService)
    private readonly fileAccess: FileAccessService,
    @Inject(FolderAccessService)
    private readonly folderAccess: FolderAccessService,
    @Inject(FolderCollectionService)
    private readonly folderCollection: FolderCollectionService,
    @Inject(MediaToolService)
    private readonly mediaTool: MediaToolService
  ) {}

  async create(
    input: string,
    boundary: ClipBoundary,
    output: string
  ): Promise<boolean> {
    if (input === output || boundary.begin >= boundary.end) {
      return false;
    }

    const parsedInput = await this.parseContentPath(input);

    if (parsedInput === null) {
      return false;
    }

    let parsedOutput: ParsedContentPath | null = null;
    if (ClipService.hasSameCollectionId(input, output)) {
      const parsedContentFilename = PathHelper.parseContentFilename(output);

      if (parsedContentFilename === null) {
        return false;
      }

      parsedOutput = {
        collectionIdPath: parsedInput.collectionIdPath,
        relativeFilename: parsedContentFilename.path
      };
    } else {
      parsedOutput = await this.parseContentPath(output);
    }

    if (parsedOutput === null) {
      return false;
    }

    const inputAbsolutePath = Path.join(
      parsedInput.collectionIdPath,
      parsedInput.relativeFilename
    );

    const outputAbsolutePath = Path.join(
      parsedOutput.collectionIdPath,
      parsedOutput.relativeFilename
    );

    if (
      !(await FSHelper.exists(inputAbsolutePath)) ||
      (await FSHelper.exists(outputAbsolutePath))
    ) {
      return false;
    }

    this.mediaTool
      .makeClip(inputAbsolutePath, boundary, outputAbsolutePath)
      .then(async () => {
        const relativeToMediaOutput =
          PathHelper.relativeToMedia(outputAbsolutePath);

        const file = await this.fileAccess.create(relativeToMediaOutput);

        if (file === null) {
          return;
        }

        const collectionRoot = PathHelper.relativeToMedia(
          parsedOutput.collectionIdPath
        );

        await this.folderAccess.increaseStatAndUpdateParent(
          collectionRoot,
          PathHelper.fileFolder(relativeToMediaOutput),
          { files: 1, size: file.size }
        );

        await this.fileAccess.generateAssets(file);
      });

    return true;
  }

  private async parseContentPath(
    filename: string
  ): Promise<ParsedContentPath | null> {
    const parsedContentFilename = PathHelper.parseContentFilename(filename);

    if (parsedContentFilename === null) {
      return null;
    }

    const collectionEntry = await this.folderCollection.FindFolder(
      parsedContentFilename.collectionId
    );

    if (collectionEntry === null) {
      return null;
    }

    return {
      collectionIdPath: collectionEntry.folder,
      relativeFilename: parsedContentFilename.path
    };
  }

  private static hasSameCollectionId(a: string, b: string): boolean {
    const sep = '/';
    const shortestLength = Math.min(a.length, b.length);

    for (let n = 0; n < shortestLength && (a[n] !== sep || b[n] !== sep); ++n) {
      if (a[n] !== b[n]) {
        return false;
      }
    }

    return true;
  }
}
