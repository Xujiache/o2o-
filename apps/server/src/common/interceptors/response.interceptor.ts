import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiResponse, ErrorCode } from '@o2o/contracts';
import { map, Observable } from 'rxjs';

import { RAW_RESPONSE } from '../decorators/raw-response.decorator';
import { getTraceId } from '../utils/als';

@Injectable()
export class ResponseInterceptor<T = unknown> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | T> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE, [context.getHandler(), context.getClass()]);
    if (isRaw) return next.handle();

    return next.handle().pipe(
      map((data) => ({
        code: ErrorCode.OK,
        message: 'OK',
        data: (data as T | null | undefined) ?? null,
        traceId: getTraceId(),
        timestamp: Date.now(),
      })),
    );
  }
}
