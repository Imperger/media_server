import { Module } from '@nestjs/common';
import { FileSyncService } from './file-sync.service';
import { FileController } from './file.controller';
import { FileAccessService } from './file-access.service';
import { MediaToolModule } from '@/media-tool/media-tool.module';
import { FolderController } from './folder.controller';

@Module({
  providers: [FileSyncService, FileAccessService],
  exports: [FileSyncService, FileAccessService],
  controllers: [FileController, FolderController],
  imports: [MediaToolModule]
})
export class FileSModule {}
