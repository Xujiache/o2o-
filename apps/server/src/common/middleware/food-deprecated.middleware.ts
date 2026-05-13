import { Injectable, NestMiddleware } from '@nestjs/common';
import { ErrorCode } from '@o2o/contracts';
import type { NextFunction, Request, Response } from 'express';

/**
 * 外卖路由灰度下线 — 命中以下前缀的请求直接返回 410 Gone。
 *   /api/v1/c/food/*          客户端外卖
 *   /api/v1/m/food/*          商家外卖(若存在)
 *   /api/v1/c/food-home/*     外卖首页
 *
 * 当 FOOD_ROUTES_GONE != 'true' 时关闭(便于开发期临时回滚)。
 * 跑腿(errand)与生鲜(grocery)路由完全不受影响。
 */
@Injectable()
export class FoodDeprecatedMiddleware implements NestMiddleware {
  private readonly enabled = (process.env.FOOD_ROUTES_GONE ?? 'true').toLowerCase() === 'true';

  private readonly prefixes = ['/api/v1/c/food', '/api/v1/m/food', '/api/v1/c/food-home', '/api/v1/admin/food-order'];

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.enabled) {
      next();
      return;
    }
    const path = req.path || req.url || '';
    const hit = this.prefixes.some((p) => path.startsWith(p));
    if (!hit) {
      next();
      return;
    }
    res.status(410).json({
      code: ErrorCode.STATUS_INVALID,
      msg: '外卖服务已升级为生鲜商城,请进入"生鲜商城"频道下单',
      data: null,
    });
  }
}
