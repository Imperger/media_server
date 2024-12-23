import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';

import { SearchRequestDto } from './dto/search-request.dto';
import { Resolution, SearchResult, SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('resolutions')
  async availableResolutions(): Promise<Resolution[]> {
    return this.search.availableResolutions();
  }

  @Post()
  @HttpCode(200)
  async doSearch(@Body() request: SearchRequestDto): Promise<SearchResult> {
    return this.search.search(request);
  }
}
