import { IsNumber, IsString, Min } from 'class-validator';

import { IsTag } from './is-tag';

import { IsGreaterThanProp } from '@/lib/class-validator/is-greater-than-prop';

export class FragmentTagFileAttachmentDto {
  @IsTag()
  readonly tag: string;

  @IsNumber()
  readonly collectionId: number;

  @IsString()
  readonly filename: string;

  @Min(0)
  readonly begin: number;

  @IsGreaterThanProp<FragmentTagFileAttachmentDto>('begin')
  readonly end: number;
}
