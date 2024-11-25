import { PipeTransform, Injectable } from '@nestjs/common';

import { InvalidTagNameException } from '../exceptions';
import { isValidTag } from '../is-valid-tag';

@Injectable()
export class TagValidationPipe implements PipeTransform {
  transform(value: string) {
    if (isValidTag(value)) {
      return value;
    }

    throw new InvalidTagNameException();
  }
}
