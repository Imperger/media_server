import * as Fs from 'fs/promises';
import * as Path from 'path';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Res,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import * as mime from 'mime-types';
import * as rangeParser from 'range-parser';

import { RenameFileDto } from './dto/rename-file.dto';
import { FileContentNotFoundException } from './exceptions';
import { FileAccessService, RangeOptions } from './file-access.service';
import { CacheControlGuard } from './guards/cache-control.guard';

import { assetHash } from '@/lib/asset-hash';
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

    let streamOptions: RangeOptions | undefined;
    if (range) {
      const { start, end } = this.parseRange(range, fileRecord.size);
      streamOptions = { start, end };

      res.header(
        'Content-Range',
        this.contentRange(start, end, fileRecord.size)
      );
      res.status(206);
    } else {
      res.header('Content-Length', fileRecord.size);
    }

    res.header('Asset-Prefix', assetHash(fileRecord.filename));

    return new StreamableFile(
      await this.fileAccessService.createContentStream(
        Path.join(PathHelper.mediaEntry, fileRecord.filename),
        streamOptions
      ),
      { type: this.contentType(filename) }
    );
  }

  @Get('preview/:filename')
  @UseGuards(
    CacheControlGuard({ maxAge: 300, assetEntry: PathHelper.previewEntry })
  )
  @Header('Connection', 'keep-alive')
  async preview(@Param('filename') filename: string) {
    const target = Path.join(PathHelper.previewEntry, filename);
    const stream = await this.fileAccessService.createContentStream(target);
    const stat = await Fs.stat(target);

    return new StreamableFile(stream, {
      type: this.contentType(filename),
      length: stat.size
    });
  }

  @Get('scrubbing/:filename')
  @UseGuards(
    CacheControlGuard({ maxAge: 300, assetEntry: PathHelper.scrubbingEntry })
  )
  @Header('Connection', 'keep-alive')
  async scrubbing(@Param('filename') filename: string) {
    const target = Path.join(PathHelper.scrubbingEntry, filename);
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
    @Param('*') filename: string
  ) {
    await this.fileAccessService.removeMedia(collectionId, filename);
  }

  @Patch('rename/:collectionId/*')
  async rename(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') filename: string,
    @Body() { newFilename }: RenameFileDto
  ) {
    const assetPrefix = await this.fileAccessService.rename(
      collectionId,
      filename,
      newFilename
    );

    return {
      success: assetPrefix !== null,
      ...(assetPrefix && { assetPrefix })
    };
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

  private contentType(filename: string): string {
    return mime.lookup(filename) || 'application/octet-stream';
  }
}
