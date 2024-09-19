import { IsString } from 'class-validator';

export class RenameFileDto {
  @IsString()
  readonly newFilename: string;
}
