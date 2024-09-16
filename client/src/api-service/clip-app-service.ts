import { inject, injectable } from 'inversify';

import { HttpClient } from './http-client';

import { ClipBoundary } from '@/apps/clip/types';
import { Inversify } from '@/inversify';

export interface MakeClipResult {
  success: boolean;
}

@injectable()
export class ClipAppService {
  constructor(@inject(HttpClient) private readonly http: HttpClient) {}

  async create(
    input: string,
    boundary: ClipBoundary,
    output: string
  ): Promise<boolean> {
    const response = (
      await this.http.post<MakeClipResult>('app/clip/create', {
        input,
        boundary,
        output
      })
    ).data;

    return response.success;
  }
}

Inversify.bind(ClipAppService).toSelf().inSingletonScope();
