import { Controller, Get } from '@nestjs/common';

import { CollectionService } from './collection.service';

@Controller('collection')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  all() {
    return this.collectionService.GetAll();
  }
}
