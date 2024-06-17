import { CollectionType } from '../api-service/api-service';

export interface CreateCollectionParameters {
  caption: string;
  type: CollectionType;
  collectionId: string;
  folder: string;
}
