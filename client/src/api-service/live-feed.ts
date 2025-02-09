import { Socket, Manager } from 'socket.io-client';

import { TagStyle } from './meta-info';

type GlobalFileTagUpdateEventName<TPath extends string = string> =
  `tagFileGlobal.update_${TPath}`;

type FragmentFileTagUpdateEventName<TPath extends string = string> =
  `tagFileFragment.update_${TPath}`;

type GlobalFolderTagUpdateEventName<TPath extends string = string> =
  `tagFolderGlobal.update_${TPath}`;

export type LiveEvent =
  | 'folderCollection.syncProgress'
  | 'folderCollection.syncComplete'
  | 'tag.update'
  | GlobalFileTagUpdateEventName
  | FragmentFileTagUpdateEventName
  | GlobalFolderTagUpdateEventName;

interface AddTagEvent {
  type: 'add';
  name: string;
  style: TagStyle;
}

interface RenameTagEvent {
  type: 'rename';
  oldName: string;
  newName: string;
}

interface DeleteTagEvent {
  type: 'delete';
  name: string;
}

export type TagUpdateEvent = AddTagEvent | RenameTagEvent | DeleteTagEvent;
export type OnTagUpdate = (e: TagUpdateEvent) => void;

export interface AddGlobalTagEvent {
  type: 'add';
  name: string;
}

export interface RemoveGlobalTagEvent {
  type: 'remove';
  name: string;
}

export type GlobalTagUpdateEvent = AddGlobalTagEvent | RemoveGlobalTagEvent;
export type OnGlobalTagUpdate = (e: GlobalTagUpdateEvent) => void;

export interface AddFragmentTagEvent {
  type: 'add';
  name: string;
  begin: number;
  end: number;
  style: TagStyle;
}

export interface UpdateFragmentTagEvent {
  type: 'update';
  tag: string;
  begin?: number;
  end?: number;
}

export interface RemoveFragmentTagEvent {
  type: 'remove';
  name: string;
}

export type FragmentTagUpdateEvent =
  | AddFragmentTagEvent
  | UpdateFragmentTagEvent
  | RemoveFragmentTagEvent;
export type OnFragmentTagUpdate = (e: FragmentTagUpdateEvent) => void;

export type OnlineListener = (isOnline: boolean) => void;

type Unsubscriber = () => void;

type AnyListener = (payload: unknown) => void;

export class LiveFeed {
  private socket: Socket;

  private subscriptions: Map<LiveEvent, AnyListener> = new Map();

  constructor() {
    const manager = new Manager('', {});
    this.socket = manager.socket('/live_feed');

    manager.on('reconnect', () => this.onReconnect());
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

  async subscribe<TEventPayload, TReturn = void>(
    event: LiveEvent,
    listener: (payload: TEventPayload) => void
  ): Promise<TReturn | null> {
    const result = await this.socket.emitWithAck('subscribe', event);

    if (result === null) {
      return null;
    }

    if (!this.socket.listeners(event).includes(listener)) {
      this.socket.on(event, listener);
    }

    this.subscriptions.set(event, listener as AnyListener);

    return result;
  }

  async unsubscribe(event: LiveEvent) {
    this.subscriptions.delete(event);

    this.socket.emit('unsubscribe', event);

    this.socket.off(event);
  }

  get isOnline(): boolean {
    return this.socket.connected;
  }

  private onReconnect(): void {
    this.subscriptions.forEach((fn, e) => this.subscribe(e, fn));
  }
}
