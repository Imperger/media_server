import * as Path from 'path';

import {
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Res,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
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
  async preview(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    this.setupContentType(filename, res);

    return new StreamableFile(
      await this.fileAccessService.createContentStream(
        Path.join(PathHelper.previewEntry, filename)
      )
    );
  }

  @Delete(':collectionId/*')
  async delete(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') path: string
  ) {
    await this.folderAccess.remove(collectionId, path);
  }

  private setupContentType(filename: string, response: FastifyReply): void {
    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    response.header('Content-Type', mimeType);
  }
}
