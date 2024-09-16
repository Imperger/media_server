import { Module } from '@nestjs/common';

import { ClipController } from './clip.controller';
import { ClipService } from './clip.service';

import { FileModule } from '@/file/file.module';
import { FolderCollectionModule } from '@/folder-collection/folder-collection.module';
import { MediaToolModule } from '@/media-tool/media-tool.module';

@Module({
  providers: [ClipService],
  exports: [],
  controllers: [ClipController],
  imports: [FolderCollectionModule, FileModule, MediaToolModule]
})
export class ClipModule {}
