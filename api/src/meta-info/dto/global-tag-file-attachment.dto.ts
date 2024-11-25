import { IsNumber, IsString } from 'class-validator';

import { IsTag } from './is-tag';

export class GlobalTagFileAttachmentDto {
  @IsTag()
  readonly tag: string;

  @IsNumber()
  readonly collectionId: number;

  @IsString()
  readonly filename: string;
}
