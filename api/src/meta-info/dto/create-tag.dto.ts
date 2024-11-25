import { IsHexColor } from 'class-validator';

import { IsTag } from './is-tag';

export class CreateTagDto {
  @IsTag()
  readonly name: string;

  @IsHexColor()
  readonly fontColor: string;

  @IsHexColor()
  readonly backgroundColor: string;
}
