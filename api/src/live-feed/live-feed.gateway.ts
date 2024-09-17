import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { ClientsService } from './clients.service';
import { LiveFeedService } from './live-feed.service';
import { ServerRefService } from './server-ref.service';
import { SyncProgressDecoratorService } from './sync-progress-decorator.service';

@WebSocketGateway({ cors: true, namespace: 'live_feed' })
export class LiveFeedGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly serverRef: ServerRefService,
    private readonly liveFeed: LiveFeedService,
    private readonly clients: ClientsService,
    private readonly syncProgressDecorator: SyncProgressDecoratorService
  ) {}

  async afterInit(server: Server) {
    this.serverRef.ref = server;
  }

  handleConnection(socket: Socket) {
    this.clients.add(socket);
  }

  handleDisconnect(socket: Socket) {
    this.clients.remove(socket);
  }

  @SubscribeMessage('subscribe')
  subscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: string
  ): unknown {
    if (!this.liveFeed.isValidEvent(payload)) {
      return null;
    }

    this.clients.attachSubscription(socket, payload);

    if (payload === 'folderCollection.syncProgress') {
      return this.syncProgressDecorator.progress;
    }

    return true;
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: string
  ): boolean {
    if (!this.liveFeed.isValidEvent(payload)) {
      return false;
    }

    this.clients.detachSubscription(socket, payload);

    return true;
  }
}
