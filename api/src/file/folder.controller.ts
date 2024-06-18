import {
  Controller,
  Get,
  Header,
  Param,
  StreamableFile,
  UseGuards
} from '@nestjs/common';
import { FileAccessService } from './file-access.service';
import { PathHelper } from '@/lib/PathHelper';
import { CacheControlGuard } from './guards/cache-control.guard';

@Controller('folder')
export class FolderController {
  constructor(private readonly fileAccessService: FileAccessService) {}

  @Get('preview/:filename')
  @Header('Connection', 'keep-alive')
  @UseGuards(
    CacheControlGuard({ maxAge: 300, assetEntry: PathHelper.previewEntry })
  )
  async preview(@Param('filename') filename: string) {
    return new StreamableFile(
      await this.fileAccessService.getPreviewStream(
        filename,
        'folder_cover.jpg'
      )
    );
  }
}
