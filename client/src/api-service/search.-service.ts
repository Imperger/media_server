import { inject, injectable } from 'inversify';

import type { FileRecord } from './api-service';
import { HttpClient } from './http-client';

import { Inversify } from '@/inversify';

export interface Resolution {
  width: number;
  height: number;
}

type QueryType = 'text' | 'regex';

export interface Query {
  type: QueryType;
  query: string;
}

export type DurationCondition = 'less' | 'greater';

export interface DurationAttribute {
  type: 'duration';
  duration: number;
  condition: DurationCondition;
}

export type SizeCondition = 'less' | 'greater';

export interface SizeAttribute {
  type: 'size';
  size: number;
  condition: SizeCondition;
}

export type ResolutionCondition =
  | 'less'
  | 'less_equal'
  | 'equal'
  | 'greater_equal'
  | 'greater';

export interface ResolutionAttribute {
  type: 'resolution';
  width: number;
  height: number;
  condition: ResolutionCondition;
}

export type Attribute = DurationAttribute | SizeAttribute | ResolutionAttribute;

export interface SearchRequest {
  query?: Query;
  path?: string;
  tags?: string[];
  attributes?: Attribute[];
}

export interface SearchResult {
  total: number;
  items: FileRecord[];
}

@injectable()
export class SearchService {
  constructor(@inject(HttpClient) private readonly http: HttpClient) {}

  async availableResolutions(): Promise<Resolution[]> {
    return (await this.http.get<Resolution[]>('search/resolutions')).data;
  }

  async search(request: SearchRequest): Promise<SearchResult> {
    return (await this.http.post<SearchResult>('search', request)).data;
  }
}

Inversify.bind(SearchService).toSelf().inSingletonScope();
