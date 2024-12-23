import { Module } from '@nestjs/common';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

import { FolderCollectionModule } from '@/folder-collection/folder-collection.module';

@Module({
  imports: [FolderCollectionModule],
  providers: [SearchService],
  controllers: [SearchController]
})
export class SearchModule {}
