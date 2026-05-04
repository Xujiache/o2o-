import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * 回调验签守卫(基类)— 子类实现 verify() 用对应 provider 的算法。
 * 业务阶段(支付/推送)各自继承本类,注册到对应 callback 路由。
 */
@Injectable()
export abstract class CallbackVerifyGuard implements CanActivate {
  abstract readonly providerName: string;
  abstract verify(headers: Record<string, string | string[] | undefined>, body: string): boolean;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const ok = this.verify(req.headers, JSON.stringify(req.body ?? {}));
    if (!ok) throw new ForbiddenException(`${this.providerName} callback signature invalid`);
    return true;
  }
}
