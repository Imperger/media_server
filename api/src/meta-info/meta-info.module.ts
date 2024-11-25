import { Module } from '@nestjs/common';

import { FragmentTagFileService } from './fragment-tag-file.service';
import { GlobalTagFileService } from './global-tag-file.service';
import { GlobalTagFolderService } from './global-tag-folder.service';
import { MetaInfoController } from './meta-info.controller';
import { TagService } from './tag.service';

import { FileModule } from '@/file/file.module';
import { LiveFeedModule } from '@/live-feed/live-feed.module';

@Module({
  controllers: [MetaInfoController],
  providers: [
    TagService,
    GlobalTagFileService,
    GlobalTagFolderService,
    FragmentTagFileService
  ],
  imports: [FileModule, LiveFeedModule]
})
export class MetaInfoModule {}
