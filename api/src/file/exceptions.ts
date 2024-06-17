import { AppException, exceptionGuardFactory } from '@/lib/exception';
import { HttpStatus } from '@nestjs/common';

export class FileException extends AppException {}

export enum FileError {
  FileNotFound = 130
}

export class FileNotFoundException extends FileException {
  code = FileError.FileNotFound;
  status = HttpStatus.NOT_FOUND;
}

export const isFileException = exceptionGuardFactory(FileException, {
  min: 130,
  max: 140
});
