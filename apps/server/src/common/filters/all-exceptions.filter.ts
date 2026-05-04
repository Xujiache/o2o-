import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ErrorCode, ErrorCodeDefaultMessage, type ErrorCodeValue } from '@o2o/contracts';
import type { Response } from 'express';

import { getTraceId } from '../utils/als';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const { httpStatus, code, message } = this.classify(exception);
    const traceId = getTraceId();

    if (httpStatus >= 500) {
      this.logger.error(
        { err: exception, traceId },
        `Unhandled error: ${exception instanceof Error ? exception.message : String(exception)}`,
      );
    }

    res.status(httpStatus).json({
      code,
      message,
      data: null,
      traceId,
      timestamp: Date.now(),
    });
  }

  private classify(exception: unknown): { httpStatus: number; code: ErrorCodeValue; message: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const resp = exception.getResponse();
      let userMessage = exception.message;
      if (typeof resp === 'object' && resp !== null && 'message' in resp) {
        const m = (resp as { message: string | string[] }).message;
        userMessage = Array.isArray(m) ? m.join('; ') : m;
      }
      const code = this.statusToCode(status);
      return { httpStatus: status, code, message: userMessage || ErrorCodeDefaultMessage[code] };
    }
    return {
      httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: ErrorCodeDefaultMessage[ErrorCode.INTERNAL_ERROR],
    };
  }

  private statusToCode(status: number): ErrorCodeValue {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.INVALID_PARAM;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.DATA_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.DUPLICATE_REQUEST;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.STATUS_INVALID;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT_EXCEEDED;
      case HttpStatus.BAD_GATEWAY:
      case HttpStatus.SERVICE_UNAVAILABLE:
      case HttpStatus.GATEWAY_TIMEOUT:
        return ErrorCode.THIRD_PARTY_ERROR;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
