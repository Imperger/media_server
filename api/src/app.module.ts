import * as path from 'path';

import { DrizzleBetterSQLiteModule } from '@knaadh/nestjs-drizzle-better-sqlite3';
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';

import { DbConfig } from '../drizzle.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollectionModule } from './collection/collection.module';
import { Collection } from './collection/schemas/collection.schema';
import { FileModule } from './file/file.module';
import { FolderCollectionModule } from './folder-collection/folder-collection.module';
import { LiveFeedModule } from './live-feed/live-feed.module';
import { MediaToolModule } from './media-tool/media-tool.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'client'),
      exclude: ['/api/(.*)']
    }),
    CollectionModule,
    DrizzleBetterSQLiteModule.register({
      tag: 'DB',
      sqlite3: {
        filename: DbConfig.dbCredentials.url
      },
      config: { schema: { Collection } }
    }),
    FolderCollectionModule,
    FileModule,
    MediaToolModule,
    LiveFeedModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
