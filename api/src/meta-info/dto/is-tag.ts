import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments
} from 'class-validator';

import { isValidTag } from '../is-valid-tag';

export function IsTag(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsTag',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _: ValidationArguments) {
          return typeof value === 'string' && isValidTag(value);
        }
      }
    });
  };
}
