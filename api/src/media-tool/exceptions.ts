import { HttpStatus } from '@nestjs/common';

import { AppException, exceptionGuardFactory } from '@/lib/exception';

export class MediaToolException extends AppException {}

export enum MediaToolError {
  MissingVideoStream = 100
}

export class MissingVideoStreamException extends MediaToolException {
  code = MediaToolError.MissingVideoStream;
  status = HttpStatus.BAD_REQUEST;
}

export const isCollectionFolderException = exceptionGuardFactory(
  MediaToolException,
  {
    min: 120,
    max: 130
  }
);
