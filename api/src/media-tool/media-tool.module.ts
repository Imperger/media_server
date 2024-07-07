import { Module } from '@nestjs/common';

import { MediaToolService } from './media-tool.service';

@Module({
  providers: [MediaToolService],
  exports: [MediaToolService]
})
export class MediaToolModule {}
