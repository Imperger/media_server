import { isAxiosError } from 'axios';
import { inject, injectable } from 'inversify';

import { HttpClient } from './http-client';

import { Inversify } from '@/inversify';
import { AtLeastOne } from '@/lib/type-helper';

export interface CreateTag {
  name: string;
}

interface TagProps {
  name?: string;
}

type TagPatch = AtLeastOne<TagProps>;

export interface FragmentTagAttachment {
  tag: string;
  begin: number;
  end: number;
}

export interface FragmentTagUpdate {
  tag: string;
  begin?: number;
  end?: number;
}

export interface FragmentTag {
  name: string;
  begin: number;
  end: number;
  style: TagStyle;
}

export interface TagStyle {
  fontColor: string;
  backgroundColor: string;
}

export interface Tag {
  tag: string;
  style: TagStyle;
}

@injectable()
export class MetaInfoService {
  constructor(@inject(HttpClient) private readonly http: HttpClient) {}

  async createTag(name: string, style: TagStyle): Promise<boolean> {
    try {
      await this.http.post<void>('meta-info/tag', {
        name,
        ...style
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async updateTag(name: string, patch: TagPatch): Promise<boolean> {
    try {
      await this.http.patch<void>(`meta-info/tag/${name}`, patch);
      return true;
    } catch (e) {
      return false;
    }
  }

  async listAllTags() {
    return (await this.http.get<Tag[]>('meta-info/tag')).data;
  }

  async deleteTag(name: string): Promise<boolean> {
    try {
      await this.http.delete(`meta-info/tag/${name}`);
    } catch (e) {
      if (isAxiosError(e)) {
        return false;
      }
    }

    return true;
  }

  async attachFileGlobalTag(
    tag: string,
    collectionId: number,
    filename: string
  ): Promise<boolean> {
    try {
      await this.http.post<void>('meta-info/tag-file-global', {
        tag,
        collectionId,
        filename
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async listAttachedFileGlobalTags(
    collectionId: number,
    filename: string
  ): Promise<string[]> {
    try {
      return (
        await this.http.get<string[]>(
          `meta-info/tag-file-global/${collectionId}/${filename}`
        )
      ).data;
    } catch (e) {
      if (isAxiosError(e)) {
        throw new Error(
          `Failed to retrieve global tags for '${collectionId}/${filename}'`
        );
      }

      return [];
    }
  }

  async detachFileGlobalTag(
    tag: string,
    collectionId: number,
    filename: string
  ): Promise<boolean> {
    try {
      await this.http.delete(
        `meta-info/tag-file-global/${tag}/${collectionId}/${filename}`
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async attachFileFragmentTag(
    collectionId: number,
    filename: string,
    { tag, begin, end }: FragmentTagAttachment
  ): Promise<boolean> {
    try {
      await this.http.post<void>('meta-info/tag-file-fragment', {
        tag,
        begin,
        end,
        collectionId,
        filename
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async updateAttachedFileFragmentTag(
    collectionId: number,
    filename: string,
    { tag, begin, end }: FragmentTagUpdate
  ): Promise<boolean> {
    try {
      await this.http.patch<void>(
        `meta-info/tag-file-fragment/${tag}/${collectionId}/${filename}`,
        {
          ...(begin !== undefined && { begin }),
          ...(end !== undefined && { end })
        }
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async listAttachedFileFragmentTags(
    collectionId: number,
    filename: string
  ): Promise<FragmentTag[]> {
    try {
      return (
        await this.http.get<FragmentTag[]>(
          `meta-info/tag-file-fragment/${collectionId}/${filename}`
        )
      ).data;
    } catch (e) {
      if (isAxiosError(e)) {
        throw new Error(
          `Failed to retrieve fragment tags for '${collectionId}/${filename}'`
        );
      }

      return [];
    }
  }

  async detachFileFragmentTag(
    tag: string,
    collectionId: number,
    filename: string
  ): Promise<boolean> {
    try {
      await this.http.delete(
        `meta-info/tag-file-fragment/${tag}/${collectionId}/${filename}`
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  async attachFolderGlobalTag(
    tag: string,
    collectionId: number,
    relativePath: string
  ): Promise<boolean> {
    try {
      await this.http.post<void>('meta-info/tag-folder-global', {
        tag,
        collectionId,
        path: relativePath
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async listFolderAttachedGlobalTags(
    collectionId: number,
    relativePath: string
  ): Promise<string[]> {
    try {
      return (
        await this.http.get<string[]>(
          `meta-info/tag-folder-global/${collectionId}/${relativePath}`
        )
      ).data;
    } catch (e) {
      if (isAxiosError(e)) {
        throw new Error(
          `Failed to retrieve global tags for '${collectionId}/${relativePath}'`
        );
      }

      return [];
    }
  }

  async detachFolderGlobalTag(
    tag: string,
    collectionId: number,
    relativePath: string
  ): Promise<boolean> {
    try {
      await this.http.delete(
        `meta-info/tag-folder-global/${tag}/${collectionId}/${relativePath}`
      );
      return true;
    } catch (e) {
      return false;
    }
  }
}

Inversify.bind(MetaInfoService).toSelf().inSingletonScope();
