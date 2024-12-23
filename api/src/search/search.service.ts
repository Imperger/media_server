import * as path from 'path';

import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  BinaryOperator,
  eq,
  gt,
  gte,
  lt,
  lte,
  or,
  SQL,
  sql,
  SQLWrapper
} from 'drizzle-orm';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { match } from 'ts-pattern';

import {
  AttributeType,
  DurationCondition,
  QueryDto,
  QueryType,
  ResolutionCondition,
  SearchRequestDto,
  SizeCondition
} from './dto/search-request.dto';

import type { FileRecord } from '@/file/file-access.service';
import { File } from '@/file/schemas/file.schema';
import { Folder } from '@/file/schemas/folder.schema';
import {
  FolderCollection,
  FolderCollectionService
} from '@/folder-collection/folder-collection.service';
import { assetHash } from '@/lib/asset-hash';
import { weightedDamerauLevenshtein, Weights } from '@/lib/damerau-levenshtein';
import { ExceptionTrap } from '@/lib/exception-trap';
import { PathHelper } from '@/lib/PathHelper';
import { TagFileFragment } from '@/meta-info/schemas/tag-file-fragment.schema';
import { TagFileGlobal } from '@/meta-info/schemas/tag-file-global.schema';
import { TagFolderGlobal } from '@/meta-info/schemas/tag-folder.schema';
import { Tag } from '@/meta-info/schemas/tag.schema';

type AnyPossibleCondition =
  | `${DurationCondition}`
  | `${SizeCondition}`
  | `${ResolutionCondition}`;

export interface Resolution {
  width: number;
  height: number;
}

export type SafeFileRecord = Omit<FileRecord, 'id'>;

export interface SearchResult {
  total: number;
  items: SafeFileRecord[];
}

export interface ParsedPath {
  collectionId: number;
  path: string;
}

@Injectable()
export class SearchService {
  constructor(
    @Inject('DB')
    private db: BetterSQLite3Database<{
      File: typeof File;
      Tag: typeof Tag;
      TagFileGlobal: typeof TagFileGlobal;
      TagFileFragment: typeof TagFileFragment;
      TagFolderGlobal: typeof TagFolderGlobal;
      Folder: typeof Folder;
    }>,
    private readonly folderCollection: FolderCollectionService
  ) {}

  async availableResolutions(): Promise<Resolution[]> {
    return this.db
      .select({ width: File.width, height: File.height })
      .from(File)
      .groupBy(File.width, File.height);
  }

  async search({
    query,
    path: searchPath,
    tags,
    attributes
  }: SearchRequestDto): Promise<SearchResult> {
    const conditions: (SQLWrapper | undefined)[] = [];

    let selectorQuery = this.db
      .select({
        filename: File.filename,
        depth: File.depth,
        size: File.size,
        width: File.width,
        height: File.height,
        duration: File.duration,
        createdAt: File.createdAt
      })
      .from(File)
      .$dynamic();

    const folderCollections = (await this.folderCollection.GetAllFolders()).map(
      (x) => ({ ...x, folder: PathHelper.relativeToMedia(x.folder) })
    );

    if (searchPath) {
      const { collectionId, path: relativePath } =
        PathHelper.parseContentPath(searchPath);

      const collection = folderCollections.find(
        (x) => x.collectionId === collectionId
      );

      if (collection === undefined) {
        return { total: 0, items: [] };
      }

      const targetFolder = path.join(collection.folder, relativePath);

      if (targetFolder !== '.') {
        const filenameMask = `${targetFolder}%`;

        conditions.push(
          and(
            gt(File.depth, PathHelper.fileDepth(targetFolder)),
            sql`${File.filename} like ${filenameMask}`
          )
        );
      }
    }

    if (tags?.length) {
      selectorQuery = selectorQuery
        .leftJoin(TagFileGlobal, eq(TagFileGlobal.fileId, File.id))
        .leftJoin(TagFileFragment, eq(TagFileFragment.fileId, File.id))
        .leftJoin(Folder, sql`${File.filename} like ${Folder.path} || '%'`)
        .leftJoin(TagFolderGlobal, eq(TagFolderGlobal.folderId, Folder.id))
        .leftJoin(
          Tag,
          or(
            eq(Tag.id, TagFileGlobal.tagId),
            eq(Tag.id, TagFileFragment.tagId),
            eq(Tag.id, TagFolderGlobal.tagId)
          )
        )
        .groupBy(File.filename, Tag.name);

      conditions.push(or(...tags.map((x) => eq(Tag.name, x))));
    }

    if (attributes && attributes.length > 0) {
      const cond = SearchService.matchCondition;

      attributes.forEach((attr) => {
        const condition = match(attr)
          .with({ type: AttributeType.size }, (x) =>
            cond(attr.condition, File.size, x.size)
          )
          .with({ type: AttributeType.duration }, (x) =>
            cond(attr.condition, File.duration, x.duration)
          )
          .with({ type: AttributeType.resolution }, (x) =>
            and(
              eq(
                File.orientation,
                x.width < x.height ? 'portrait' : 'landscape'
              ),
              or(
                cond(attr.condition, File.width, x.width),
                cond(attr.condition, File.height, x.height)
              )
            )
          )
          .exhaustive();

        conditions.push(condition);
      });
    }

    let matched = tags?.length
      ? SearchService.filterMatchedByAllTags(
          await selectorQuery.where(and(...conditions)),
          tags.length
        )
      : await selectorQuery.where(and(...conditions));

    if (query) {
      matched = SearchService.filterByQuery(matched, query);
    }

    const result = matched.map((x) => ({
      ...x,
      assetPrefix: assetHash(x.filename),
      filename: SearchService.filenameToContentPath(
        x.filename,
        folderCollections
      )
    }));

    return {
      total: result.length,
      items: result
    };
  }

  private static matchCondition(
    condition: AnyPossibleCondition,
    ...args: Parameters<BinaryOperator>
  ): SQL | undefined {
    return match(condition)
      .with('less', () => lt(...args))
      .with('less_equal', () => lte(...args))
      .with('equal', () => eq(...args))
      .with('greater_equal', () => gte(...args))
      .with('greater', () => gt(...args))
      .exhaustive();
  }

  private static filterMatchedByAllTags<
    T extends Omit<SafeFileRecord, 'assetPrefix'>
  >(records: T[], tagsToMatch: number): T[] {
    const map = new Map<string, { data: T; count: number }>();

    records.forEach((x) => {
      const record = map.get(x.filename);

      if (record) {
        ++record.count;
      } else {
        map.set(x.filename, { data: x, count: 1 });
      }
    });

    return [...map.values()]
      .filter((x) => x.count >= tagsToMatch)
      .map((x) => x.data);
  }

  private static filenameToContentPath(
    filename: string,
    folderCollections: FolderCollection[]
  ): string {
    const collection = folderCollections.find((x) =>
      PathHelper.IsPathsOverlap(filename, x.folder)
    );

    if (collection === undefined) {
      return '';
    }

    return `${collection.collectionId}/${path.relative(collection.folder, filename)}`;
  }

  private static filterByQuery<T extends Pick<SafeFileRecord, 'filename'>>(
    records: T[],
    query: QueryDto
  ): T[] {
    return match(query.type)
      .with(QueryType.text, () =>
        records.sort(SearchService.makeLevensteinComparator(query.query))
      )
      .with(QueryType.regex, () =>
        records.filter(SearchService.makeRegexPredicate(query.query))
      )
      .exhaustive();
  }

  private static makeLevensteinComparator<
    T extends Pick<SafeFileRecord, 'filename'>
  >(target: string) {
    const weights: Weights = {
      insertion: 0.1,
      deletion: 1,
      substitution: 1,
      transposition: 0.2
    };

    return (a: T, b: T) =>
      weightedDamerauLevenshtein(target, path.basename(a.filename), weights) -
      weightedDamerauLevenshtein(target, path.basename(b.filename), weights);
  }

  private static makeRegexPredicate<T extends Pick<SafeFileRecord, 'filename'>>(
    regex: string
  ) {
    return ExceptionTrap.Try(() => {
      const r = new RegExp(regex);
      return (x: T) => r.test(path.basename(x.filename));
    }).CatchValue((_x: T) => false);
  }
}
