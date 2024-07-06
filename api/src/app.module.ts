import * as path from 'path';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CollectionModule } from './collection/collection.module';
import { DrizzleBetterSQLiteModule } from '@knaadh/nestjs-drizzle-better-sqlite3';
import { Collection } from './collection/schemas/collection.schema';
import { DbConfig } from '../drizzle.config';
import { FolderCollectionModule } from './folder-collection/folder-collection.module';
import { FileModule } from './file/file.module';
import { MediaToolModule } from './media-tool/media-tool.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { LiveFeedModule } from './live-feed/live-feed.module';

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
