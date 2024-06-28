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
import { FileAccessService } from './file-access.service';
import { PathHelper } from '@/lib/PathHelper';
import { CacheControlGuard } from './guards/cache-control.guard';
import { FolderAccessService } from './folder-access.service';

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
    return new StreamableFile(
      await this.fileAccessService.getPreviewStream(
        filename,
        'folder_cover.jpg'
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
}
