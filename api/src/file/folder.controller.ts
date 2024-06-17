import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { FileAccessService } from './file-access.service';

@Controller('folder')
export class FolderController {
  constructor(private readonly fileAccessService: FileAccessService) {}

  @Get('preview/:filename')
  @Header('Connection', 'keep-alive')
  async preview(@Param('filename') filename: string) {
    return new StreamableFile(
      await this.fileAccessService.getPreviewStream(
        filename,
        'folder_cover.jpg'
      )
    );
  }
}
