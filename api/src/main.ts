import * as fs from 'fs/promises';
import * as path from 'path';

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication
} from '@nestjs/platform-fastify';

import { AppModule } from './app.module';
import { AppExceptionFilter } from './lib/filters/app-exception.filter';
import { FSHelper } from './lib/FSHelper';
import { PathHelper } from './lib/PathHelper';
import { DtoValidationPipe } from './lib/pipes/dto-validation.pipe';

async function setupConfigFolder() {
  if (!(await FSHelper.isDirectory(PathHelper.mediaEntry))) {
    throw new Error('Failed to locate media source');
  }

  if (
    !(await FSHelper.isDirectory(path.join(PathHelper.mediaEntry, '.config')))
  ) {
    // Uninitialized mounted point
    await fs.mkdir(PathHelper.configEntry);
    await fs.mkdir(PathHelper.assetsEntry);
    await fs.mkdir(PathHelper.previewEntry);
    await fs.mkdir(PathHelper.trailerEntry);
    await fs.mkdir(PathHelper.scrubbingEntry);

    await fs.copyFile(
      'shema.db',
      path.join(PathHelper.configEntry, 'data.db'),
      fs.constants.COPYFILE_EXCL
    );
  }
}

async function FastifyFactory(): Promise<FastifyAdapter> {
  const key = path.join(PathHelper.mediaEntry, 'server.key');
  const cert = path.join(PathHelper.mediaEntry, 'server.cer');

  if ((await FSHelper.exists(key)) && (await FSHelper.exists(cert))) {
    return new FastifyAdapter({
      https: { key: await fs.readFile(key), cert: await fs.readFile(cert) }
    });
  } else {
    return new FastifyAdapter();
  }
}

async function bootstrap() {
  await setupConfigFolder();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    await FastifyFactory()
  );

  process.once('SIGTERM', () => app.close());

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new AppExceptionFilter());
  app.useGlobalPipes(new DtoValidationPipe());

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
