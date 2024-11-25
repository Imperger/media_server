import { IsOptional, Min } from 'class-validator';

import { IsGreaterThanProp } from '@/lib/class-validator/is-greater-than-prop';

export class FragmentTagUpdateDto {
  @IsOptional()
  @Min(0)
  readonly begin?: number;

  @IsOptional()
  @IsGreaterThanProp<FragmentTagUpdateDto>('begin')
  readonly end?: number;
}
