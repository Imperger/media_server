import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments
} from 'class-validator';

import { PathHelper } from '../path-helper';

export function IsContentPath(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsContentPath',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return typeof value === 'string' && PathHelper.isContentPath(value);
        }
      }
    });
  };
}
