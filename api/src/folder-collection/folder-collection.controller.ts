import { CreateCollectionDto } from '@/folder-collection/dto/create-collection.dts';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post
} from '@nestjs/common';
import {
  FolderCollectionService,
  FolderContentRecord
} from './folder-collection.service';
import { UnknownFolderException } from './exceptions';

interface MetainfoResult {
  collectionId: string;
  folder: string;
  syncedAt: number;
}

@Controller('collection-folder')
export class FolderCollectionController {
  constructor(
    private readonly collectionFolderService: FolderCollectionService
  ) {}

  @Post()
  async create(@Body() collection: CreateCollectionDto) {
    return this.collectionFolderService.CreateFolder(collection);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    if (!(await this.collectionFolderService.RemoveFolder(id))) {
      throw new UnknownFolderException();
    }
  }

  @Patch(':id')
  async sync(@Param('id', ParseIntPipe) id: number) {
    return {
      syncedFiles: await this.collectionFolderService.syncFolder(id)
    };
  }

  @Get(':id/*')
  async list(
    @Param('id', ParseIntPipe) id: number,
    @Param('*') path: string
  ): Promise<FolderContentRecord[]> {
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    return this.collectionFolderService.listFolderContent(id, path);
  }

  @Get('metainfo/:id')
  async metainfo(
    @Param('id', ParseIntPipe) id: number
  ): Promise<MetainfoResult> {
    const info = await this.collectionFolderService.FindFolder(id);

    if (info === null) {
      throw new UnknownFolderException();
    }

    return {
      collectionId: info.collectionId,
      folder: info.folder,
      syncedAt: info.syncedAt
    };
  }
}
