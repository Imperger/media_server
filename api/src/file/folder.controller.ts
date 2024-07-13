import * as Fs from 'fs/promises';
import * as Path from 'path';

import {
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import * as mime from 'mime';

import { FileAccessService } from './file-access.service';
import { FolderAccessService } from './folder-access.service';
import { CacheControlGuard } from './guards/cache-control.guard';

import { PathHelper } from '@/lib/PathHelper';

@Controller('folder')
export class FolderController {
  constructor(
    private readonly fileAccessService: FileAccessService,
    private readonly folderAccess: FolderAccessService
  ) {}

  @Get('preview/:filename')
  @Header('Connection', 'keep-alive')
  @UseGuards(
    CacheControlGuard({ maxAge: 300, assetEntry: PathHelper.previewEntry })
  )
  async preview(@Param('filename') filename: string) {
    const target = Path.join(PathHelper.previewEntry, filename);
    const stream = await this.fileAccessService.createContentStream(target);
    const stat = await Fs.stat(target);

    return new StreamableFile(stream, {
      type: this.contentType(filename),
      length: stat.size
    });
  }

  @Delete(':collectionId/*')
  async delete(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') path: string
  ) {
    await this.folderAccess.remove(collectionId, path);
  }

  private contentType(filename: string): string {
    return mime.lookup(filename) || 'application/octet-stream';
  }
}
