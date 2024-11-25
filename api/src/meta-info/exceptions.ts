import { HttpStatus } from '@nestjs/common';

import { AppException, exceptionGuardFactory } from '@/lib/exception';

export class TagException extends AppException {}

export enum TagError {
  TagNotFound = 140,
  InvalidTagError,
  FragmentTagCollisionError,
  UnknownAttachmentTargetError
}

export class TagNotFoundException extends TagException {
  code = TagError.TagNotFound;
  status = HttpStatus.NOT_FOUND;
}

export class InvalidTagNameException extends TagException {
  code = TagError.InvalidTagError;
  status = HttpStatus.BAD_REQUEST;
}

export class FragmentTagCollisionException extends TagException {
  code = TagError.FragmentTagCollisionError;
  status = HttpStatus.BAD_REQUEST;
}

export class UnknowAttachmentTargetException extends TagException {
  code = TagError.UnknownAttachmentTargetError;
  status = HttpStatus.BAD_REQUEST;
}

export const isTagException = exceptionGuardFactory(TagException, {
  min: 140,
  max: 150
});
