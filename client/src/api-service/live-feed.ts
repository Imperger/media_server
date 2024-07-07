import { Socket, io } from 'socket.io-client';

export type LiveEvent =
  | 'folderCollection.syncProgress'
  | 'folderCollection.syncComplete';

export type OnlineListener = (isOnline: boolean) => void;

type Unsubscriber = () => void;

export class LiveFeed {
  private socket: Socket;

  constructor() {
    this.socket = io('/live_feed', {});
  }

  onOnline(listener: OnlineListener): Unsubscriber {
    const onConnectListener = listener.bind(null, true);
    const onDisconnectListener = listener.bind(null, false);

    this.socket.on('connect', onConnectListener);
    this.socket.on('disconnect', onDisconnectListener);

    return () => {
      this.socket.off('connect', onConnectListener);
      this.socket.off('disconnect', onDisconnectListener);
    };
  }

  async subscribe<TEventPayload>(
    event: LiveEvent,
    listener: (payload: TEventPayload) => void
  ): Promise<boolean> {
    if (!(await this.socket.emitWithAck('subscribe', event))) {
      return false;
    }

    if (!this.socket.listeners(event).includes(listener)) {
      this.socket.on(event, listener);
    }

    return true;
  }

  async unsubscribe(event: LiveEvent) {
    this.socket.emit('unsubscribe', event);

    this.socket.off(event);
  }

  get isOnline(): boolean {
    return this.socket.connected;
  }
}
