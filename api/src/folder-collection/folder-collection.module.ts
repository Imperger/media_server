import { Module } from '@nestjs/common';
import { FolderCollectionController } from './folder-collection.controller';
import { FolderCollectionService } from './folder-collection.service';
import { CollectionModule } from '@/collection/collection.module';
import { FileSModule } from '@/file/file.module';

@Module({
  controllers: [FolderCollectionController],
  providers: [FolderCollectionService],
  imports: [CollectionModule, FileSModule]
})
export class FolderCollectionModule {}
