import * as fs from 'fs';
import * as path from 'path';
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
  StreamableFile
} from '@nestjs/common';
import { FileAccessService } from './file-access.service';
import { FileNotFoundException } from './exceptions';

interface RangeOptions {
  start?: number;
  end?: number;
}

interface Response {
  header(key: string, value: string): void;
  status(statusCode: number): void;
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
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    const fileRecord = await this.fileAccessService.findFile(filename);

    if (fileRecord === null) {
      throw new FileNotFoundException();
    }

    const mimeType = mime.lookup(filename) as string;

    res.header('Content-Type', mimeType);

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
  async preview(@Param('filename') filename: string) {
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
}
