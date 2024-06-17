import { IsOptional, Length } from 'class-validator';

export enum CollectionType {
  Folder = 'folder',
  View = 'view'
}

export class CreateCollectionDto {
  @IsOptional()
  @Length(1, 32)
  readonly caption?: string;

  @Length(1, 16)
  readonly collectionId: string;

  @Length(1, 1024)
  readonly folder: string;
}
