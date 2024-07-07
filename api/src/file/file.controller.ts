import * as Path from 'path';

import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  ParseIntPipe,
  Res,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import * as mime from 'mime-types';
import * as rangeParser from 'range-parser';

import { FileContentNotFoundException } from './exceptions';
import { FileAccessService, RangeOptions } from './file-access.service';
import { CacheControlGuard } from './guards/cache-control.guard';

import { PathHelper } from '@/lib/PathHelper';

@Controller('file')
export class FileController {
  constructor(private readonly fileAccessService: FileAccessService) {}

  @Get('content/:collectionId/*')
  @Header('Accept-Ranges', 'bytes')
  @Header('Connection', 'keep-alive')
  async fileContent(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') filename: string,
    @Headers('Range') range: string,
    @Res({ passthrough: true }) res: FastifyReply
  ): Promise<StreamableFile> {
    const fileRecord = await this.fileAccessService.find(
      collectionId,
      filename
    );

    if (fileRecord === null) {
      throw new FileContentNotFoundException();
    }

    this.setupContentType(filename, res);

    let streamOptions: RangeOptions | undefined;
    if (range) {
      const { start, end } = this.parseRange(range, fileRecord.size);
      streamOptions = { start, end };

      res.header(
        'Content-Range',
        this.contentRange(start, end, fileRecord.size)
      );
      res.status(206);
    }

    return new StreamableFile(
      await this.fileAccessService.createContentStream(
        Path.join(PathHelper.mediaEntry, filename),
        streamOptions
      )
    );
  }

  @Get('preview/:filename')
  @UseGuards(
    CacheControlGuard({ maxAge: 300, assetEntry: PathHelper.previewEntry })
  )
  @Header('Connection', 'keep-alive')
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
    @Param('*') filename: string
  ) {
    await this.fileAccessService.removeMedia(collectionId, filename);
  }

  private contentRange(start: number, end: number, size: number) {
    return `bytes ${start}-${end}/${size}`;
  }

  private parseRange(range: string, size: number) {
    const parseResult = rangeParser(size, range);
    if (parseResult === -1 || parseResult === -2 || parseResult.length !== 1) {
      throw new BadRequestException();
    }
    return parseResult[0];
  }

  private setupContentType(filename: string, response: FastifyReply): void {
    const mimeType = mime.lookup(filename) || 'application/octet-stream';
    response.header('Content-Type', mimeType);
  }
}
