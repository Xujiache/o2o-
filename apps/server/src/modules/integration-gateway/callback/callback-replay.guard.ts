import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const DEFAULT_WINDOW_SECONDS = 300;

/**
 * 回调防重放守卫 — 第三方需在 header X-Timestamp 提交毫秒时间戳;
 * 与服务器当前时间差超过窗口(默认 5 分钟)拒绝。
 */
@Injectable()
export class CallbackReplayGuard implements CanActivate {
  protected readonly windowSeconds = DEFAULT_WINDOW_SECONDS;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const tsHeader = (req.headers['x-timestamp'] as string | undefined) ?? '';
    const ts = Number(tsHeader);
    if (!ts || Number.isNaN(ts)) {
      throw new BadRequestException('callback X-Timestamp header missing or invalid');
    }
    const diff = Math.abs(Date.now() - ts);
    if (diff > this.windowSeconds * 1000) {
      throw new BadRequestException(`callback timestamp out of window (${this.windowSeconds}s)`);
    }
    return true;
  }
}
