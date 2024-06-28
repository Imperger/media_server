import { Module, forwardRef } from '@nestjs/common';
import { FileSyncService } from './file-sync.service';
import { FileController } from './file.controller';
import { FileAccessService } from './file-access.service';
import { MediaToolModule } from '@/media-tool/media-tool.module';
import { FolderController } from './folder.controller';
import { FolderAccessService } from './folder-access.service';
import { FolderCollectionModule } from '@/folder-collection/folder-collection.module';

@Module({
  providers: [FileSyncService, FileAccessService, FolderAccessService],
  exports: [FileSyncService, FileAccessService, FolderAccessService],
  controllers: [FileController, FolderController],
  imports: [MediaToolModule, forwardRef(() => FolderCollectionModule)]
})
export class FileModule {}
