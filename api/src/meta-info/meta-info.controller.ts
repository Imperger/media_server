import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post
} from '@nestjs/common';

import { CreateTagDto } from './dto/create-tag.dto';
import { FragmentTagFileAttachmentDto } from './dto/fragment-tag-file-attachment.dto';
import { FragmentTagUpdateDto } from './dto/fragment-tag-update.dto';
import { GlobalTagFileAttachmentDto } from './dto/global-tag-file-attachment.dto';
import { GlobalTagFolderAttachmentDto } from './dto/global-tag-folder-attachment.dto';
import { TagPatchDto } from './dto/tag-patch.dto';
import { TagNotFoundException } from './exceptions';
import {
  FragmentTagFileService,
  Tag as FragmentTag
} from './fragment-tag-file.service';
import { GlobalTagFileService } from './global-tag-file.service';
import { GlobalTagFolderService } from './global-tag-folder.service';
import { TagValidationPipe } from './pipes/tag-validation.pipe';
import { Tag, TagService } from './tag.service';

@Controller('meta-info')
export class MetaInfoController {
  constructor(
    private readonly tag: TagService,
    private readonly globalTagFile: GlobalTagFileService,
    private readonly fragmentTagFile: FragmentTagFileService,
    private readonly globalTagFolder: GlobalTagFolderService
  ) {}

  @Post('tag')
  async createTag(@Body() tag: CreateTagDto): Promise<void> {
    await this.tag.create(tag.name, {
      fontColor: tag.fontColor,
      backgroundColor: tag.backgroundColor
    });
  }

  @Patch('tag/:name')
  async update(
    @Param('name', TagValidationPipe) name: string,
    @Body() patch: TagPatchDto
  ): Promise<void> {
    await this.tag.rename(name, patch.name);
  }

  @Get('tag')
  async listAllTags(): Promise<Tag[]> {
    return this.tag.listAll();
  }

  @HttpCode(204)
  @Delete('tag/:name')
  async delete(@Param('name', TagValidationPipe) name: string) {
    if (!(await this.tag.delete(name))) {
      throw new TagNotFoundException();
    }
  }

  @Post('tag-file-global')
  async attachFileGlobalTagTo(
    @Body() { tag, collectionId, filename }: GlobalTagFileAttachmentDto
  ): Promise<void> {
    await this.globalTagFile.attach(tag, collectionId, filename);
  }

  @Get('tag-file-global/:collectionId/*')
  async listAttachedFileGlobalTags(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') filename: string
  ): Promise<string[]> {
    return this.globalTagFile.list(collectionId, filename);
  }

  @HttpCode(204)
  @Delete('tag-file-global/:tag/:collectionId/*')
  async detachFileGlobalTag(
    @Param('tag') tag: string,
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') filename: string
  ): Promise<void> {
    await this.globalTagFile.detach(tag, collectionId, filename);
  }

  @Post('tag-file-fragment')
  async attachFileFragmentTag(
    @Body()
    { tag, collectionId, filename, begin, end }: FragmentTagFileAttachmentDto
  ): Promise<void> {
    await this.fragmentTagFile.attach(collectionId, filename, {
      tag,
      begin,
      end
    });
  }

  @Patch('tag-file-fragment/:tag/:collectionId/*')
  async updateAttachedFileFragmentTag(
    @Param('tag') tag: string,
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') filename: string,
    @Body() update: FragmentTagUpdateDto
  ): Promise<void> {
    await this.fragmentTagFile.update(collectionId, filename, {
      tag,
      ...update
    });
  }

  @Get('tag-file-fragment/:collectionId/*')
  async listAttachedFileFragmentTags(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') filename: string
  ): Promise<FragmentTag[]> {
    return this.fragmentTagFile.list(collectionId, filename);
  }

  @HttpCode(204)
  @Delete('tag-file-fragment/:tag/:collectionId/*')
  async detachFileFragmentTag(
    @Param('tag') tag: string,
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') filename: string
  ): Promise<void> {
    await this.fragmentTagFile.detach(tag, collectionId, filename);
  }

  @Post('tag-folder-global')
  async attachFolderGlobalTag(
    @Body() { tag, collectionId, path }: GlobalTagFolderAttachmentDto
  ): Promise<void> {
    await this.globalTagFolder.attach(tag, collectionId, path);
  }

  @Get('tag-folder-global/:collectionId/*')
  async listAttachedFolderGlobalTags(
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') path: string
  ): Promise<string[]> {
    return this.globalTagFolder.list(collectionId, path);
  }

  @HttpCode(204)
  @Delete('tag-folder-global/:tag/:collectionId/*')
  async detachFolderGlobalTag(
    @Param('tag') tag: string,
    @Param('collectionId', ParseIntPipe) collectionId: number,
    @Param('*') path: string
  ): Promise<void> {
    await this.globalTagFolder.detach(tag, collectionId, path);
  }
}
