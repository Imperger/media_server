import { Module, forwardRef } from '@nestjs/common';
import { FolderCollectionController } from './folder-collection.controller';
import { FolderCollectionService } from './folder-collection.service';
import { CollectionModule } from '@/collection/collection.module';
import { FileModule } from '@/file/file.module';

@Module({
  controllers: [FolderCollectionController],
  providers: [FolderCollectionService],
  exports: [FolderCollectionService],
  imports: [CollectionModule, forwardRef(() => FileModule)]
})
export class FolderCollectionModule {}
