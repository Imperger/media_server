import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { FastifyReply } from 'fastify';

import { AppException } from '../exception';

@Catch(AppException)
export class AppExceptionFilter implements ExceptionFilter {
  catch(exception: AppException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    response.status(exception.status).send(
      exception.code !== undefined
        ? {
            code: exception.code,
            message: exception.message
          }
        : void 0
    );
  }
}
