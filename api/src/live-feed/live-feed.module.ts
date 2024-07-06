import { Module } from '@nestjs/common';
import { LiveFeedGateway } from './live-feed.gateway';
import { FolderCollectionEmitter, LiveFeedService } from './live-feed.service';
import { ClientsService } from './clients.service';
import { ServerRefService } from './server-ref.service';
import { SyncProgressDecoratorService } from './sync-progress-decorator.service';

@Module({
  providers: [
    LiveFeedGateway,
    LiveFeedService,
    ClientsService,
    ServerRefService,
    FolderCollectionEmitter,
    SyncProgressDecoratorService
  ],
  exports: [LiveFeedService, SyncProgressDecoratorService]
})
export class LiveFeedModule {}
