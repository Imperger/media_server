import { Module } from '@nestjs/common';

import { ClientsService } from './clients.service';
import { LiveFeedGateway } from './live-feed.gateway';
import {
  FolderCollectionEmitter,
  FragmentFileTagEmitter,
  GlobalFileTagEmitter,
  GlobalFolderTagEmitter,
  LiveFeedService,
  TagUpdateEmitter
} from './live-feed.service';
import { ServerRefService } from './server-ref.service';
import { SyncProgressDecoratorService } from './sync-progress-decorator.service';

@Module({
  providers: [
    LiveFeedGateway,
    LiveFeedService,
    ClientsService,
    ServerRefService,
    FolderCollectionEmitter,
    TagUpdateEmitter,
    GlobalFileTagEmitter,
    FragmentFileTagEmitter,
    GlobalFolderTagEmitter,
    SyncProgressDecoratorService
  ],
  exports: [LiveFeedService, SyncProgressDecoratorService]
})
export class LiveFeedModule {}
