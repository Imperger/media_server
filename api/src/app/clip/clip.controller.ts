import { Body, Controller, Inject, Post } from '@nestjs/common';

import { ClipService } from './clip.service';
import { CreateClipDto } from './dto/create-clip.dto';

@Controller('app/clip')
export class ClipController {
  constructor(@Inject(ClipService) private readonly clip: ClipService) {}

  @Post('create')
  async create(@Body() { input, boundary, output }: CreateClipDto) {
    return { success: await this.clip.create(input, boundary, output) };
  }
}
