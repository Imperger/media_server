import { Type } from 'class-transformer';
import { IsNumber, IsString, ValidateNested } from 'class-validator';

import { Seconds } from '@/lib/ffmpeg/ffmpeg';

class ClipBoundary {
  @IsNumber()
  begin: Seconds;

  @IsNumber()
  end: Seconds;
}

export class CreateClipDto {
  @IsString()
  readonly input: string;

  @Type(() => ClipBoundary)
  @ValidateNested()
  readonly boundary: ClipBoundary;

  @IsString()
  readonly output: string;
}
