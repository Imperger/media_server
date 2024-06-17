import { HttpStatus } from '@nestjs/common';

export class AppException {
  public readonly code: number;
  public readonly status: number;
  public readonly message: string;
}

export interface CodeRange {
  min: number;
  max: number;
}

export function exceptionGuardFactory<
  T extends AppException,
  TArgs extends any[]
>(derived: { new (...args: TArgs): T }, code: CodeRange) {
  return (e: AppException): e is T =>
    e instanceof derived && e.code >= code.min && e.code < code.max;
}

export enum CommonError {
  DtoValidationFailed = 1
}

export class CommonException extends AppException {}

export class DtoValidationFailedException extends CommonException {
  constructor(public message: string) {
    super();
  }
  code = CommonError.DtoValidationFailed;
  status = HttpStatus.BAD_REQUEST;
}

export const isCommonException = exceptionGuardFactory(CommonException, {
  min: 1,
  max: 100
});
