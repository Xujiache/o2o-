import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { CurrentPrincipal } from '../../modules/auth/types';

/**
 * 取当前请求主体 — 由 ScopeJwtGuard 填充 req.user(T09)。
 * Public 路由调用时返回 undefined。
 */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): CurrentPrincipal | undefined => {
  const req = ctx.switchToHttp().getRequest<Request & { user?: CurrentPrincipal }>();
  return req.user;
});
