import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

export interface CacheControlGuardOptions {
  assetEntry: string;
  maxAge: number;
}

export function CacheControlGuard({
  assetEntry,
  maxAge
}: CacheControlGuardOptions) {
  @Injectable()
  class CacheControlGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
      const http = context.switchToHttp();
      const request = http.getRequest<FastifyRequest>();
      const response = http.getResponse<FastifyReply>();

      const filename = path.parse(request.url).base;
      const stat = await fs.stat(path.join(assetEntry, filename));
      const etag = crypto
        .createHash('md5')
        .update(stat.birthtimeMs.toString())
        .digest('hex');

      response.header('Cache-control', `max-age=${maxAge}`);
      response.header('ETag', etag);

      if (request.headers['if-none-match'] === etag) {
        response.status(304);
        throw new HttpException('', 304);
      }

      return true;
    }
  }

  return CacheControlGuard;
}
