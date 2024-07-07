import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';

import { LiveFeedEvent } from './live-feed.service';

class Client {
  constructor(public readonly socket: Socket) {}

  addSubscription(event: LiveFeedEvent): void {
    this.socket.join(event);
  }

  removeSubscription(event: LiveFeedEvent): void {
    this.socket.leave(event);
  }
}

@Injectable()
export class ClientsService {
  private readonly clients: Client[] = [];

  add(socket: Socket) {
    this.clients.push(new Client(socket));
  }

  remove(socket: Socket) {
    const toRemove = this.clients.findIndex((x) => x.socket === socket);

    if (toRemove !== -1) {
      this.clients.splice(toRemove, 1);
    }
  }

  attachSubscription(socket: Socket, event: LiveFeedEvent): void {
    this.clients.find((x) => x.socket === socket)!.addSubscription(event);
  }

  detachSubscription(socket: Socket, event: LiveFeedEvent): void {
    this.clients.find((x) => x.socket === socket)!.removeSubscription(event);
  }
}
