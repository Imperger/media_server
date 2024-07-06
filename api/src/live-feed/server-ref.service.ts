import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ServerRefService {
  ref: Server;
}
