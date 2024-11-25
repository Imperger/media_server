import { IsTag } from './is-tag';

export class TagPatchDto {
  @IsTag()
  readonly name: string;
}
