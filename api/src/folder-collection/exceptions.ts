import { AppException, exceptionGuardFactory } from '@/lib/exception';
import { HttpStatus } from '@nestjs/common';

export class CollectionFolderException extends AppException {}

export enum CollectionFolderError {
  InvalidFolderPath = 100,
  NonUniqueCollectionId,
  UnknownFolderId,
  TooManySyncFolder
}

export class InvalidFolderPathException extends CollectionFolderException {
  code = CollectionFolderError.InvalidFolderPath;
  status = HttpStatus.BAD_REQUEST;
}

export class NonUniqueCollectionIdException extends CollectionFolderException {
  code = CollectionFolderError.NonUniqueCollectionId;
  status = HttpStatus.BAD_REQUEST;
}

export class UnknownFolderException extends CollectionFolderException {
  code = CollectionFolderError.UnknownFolderId;
  status = HttpStatus.NOT_FOUND;
}

export class TooManySyncFolderException extends CollectionFolderException {
  code = CollectionFolderError.TooManySyncFolder;
  status = HttpStatus.TOO_MANY_REQUESTS;
}

export const isCollectionFolderException = exceptionGuardFactory(
  CollectionFolderException,
  {
    min: 100,
    max: 110
  }
);
