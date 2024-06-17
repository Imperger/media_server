import { AppException, exceptionGuardFactory } from '@/lib/exception';
import { HttpStatus } from '@nestjs/common';

export class CollectionException extends AppException {}

export enum CollectionError {
  CreateCollectionError = 110,
  UnknownCollectionId
}

export class CreateCollectionException extends CollectionException {
  code = CollectionError.CreateCollectionError;
  status = HttpStatus.BAD_REQUEST;
}

export class UnknownCollectionException extends CollectionException {
  code = CollectionError.UnknownCollectionId;
  status = HttpStatus.NOT_FOUND;
}

export const isCollectionException = exceptionGuardFactory(
  CollectionException,
  {
    min: 110,
    max: 120
  }
);
