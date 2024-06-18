import * as fs from 'fs';
import * as path from 'path';
import type { FastifyReply } from 'fastify';
import * as rangeParser from 'range-parser';
import * as mime from 'mime-types';
import { PathHelper } from '@/lib/PathHelper';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  Res,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import { FileAccessService } from './file-access.service';
import { FileNotFoundException } from './exceptions';
import { CacheControlGuard } from './guards/cache-control.guard';

interface RangeOptions {
  start?: number;
  end?: number;
}

@Controller('file')
export class FileController {
  constructor(private readonly fileAccessService: FileAccessService) {}

  @Get('content/*')
  @Header('Accept-Ranges', 'bytes')
  @Header('Connection', 'keep-alive')
  async fileContent(
    @Param('*') filename: string,
    @Headers('Range') range: string,
    @Res({ passthrough: true }) res: FastifyReply
  ): Promise<StreamableFile> {
    const fileRecord = await this.fileAccessService.findFile(filename);

    if (fileRecord === null) {
      throw new FileNotFoundException();
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

    const file = fs.createReadStream(
      path.join(PathHelper.mediaEntry, filename),
      streamOptions
    );

    return new StreamableFile(file);
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
      await this.fileAccessService.getPreviewStream(
        filename,
        'default_preview.webp'
      )
    );
  }

  @Delete('*')
  async delete(@Param('*') filename: string) {
    if (await this.fileAccessService.remove(filename)) {
      await this.fileAccessService.removeAssetsAssociatedWithFile(filename);
    } else {
      throw new FileNotFoundException();
    }
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
