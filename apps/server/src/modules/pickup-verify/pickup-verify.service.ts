import { createHash } from 'node:crypto';

import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import { GroceryOrder, GroceryOrderItem, PickupPoint, PickupVerifyLog } from '../../database/entities';

import type {
  VerifyLogsPageVo,
  VerifyLogsQueryDto,
  VerifyLogVo,
  VerifyPickupDto,
  VerifyPickupVo,
} from './pickup-verify.dto';

const VERIFY_RATELIMIT_PREFIX = 'verify:rl:op:';
const VERIFY_RATELIMIT_TTL = 60;
const VERIFY_RATELIMIT_FAIL_MAX = 5;
const VERIFY_DEDUP_PREFIX = 'verify:dedup:order:';
const VERIFY_DEDUP_TTL = 5;

@Injectable()
export class PickupVerifyService {
  constructor(
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
    @InjectRepository(GroceryOrderItem) private readonly itemRepo: Repository<GroceryOrderItem>,
    @InjectRepository(PickupVerifyLog) private readonly logRepo: Repository<PickupVerifyLog>,
    @InjectRepository(PickupPoint) private readonly pointRepo: Repository<PickupPoint>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async verify(
    operatorId: string,
    operatorName: string | null,
    dto: VerifyPickupDto,
    clientIp: string | null,
  ): Promise<VerifyPickupVo> {
    // 1) 限频:同一店员 1 分钟内失败 ≥5 次封禁
    const rlKey = `${VERIFY_RATELIMIT_PREFIX}${operatorId}`;
    const failCount = Number((await this.redis.get(rlKey)) ?? 0);
    if (failCount >= VERIFY_RATELIMIT_FAIL_MAX) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        detail: 'TOO_MANY_VERIFY_FAILURES',
        message: '失败次数过多,请稍后重试',
      });
    }

    // 2) 解析输入
    let pickupCode = dto.pickupCode?.trim() ?? null;
    let verifyMethod = 2;
    if (dto.qrPayload) {
      const m = /^PICKUP:([^:]+):(\d{6})$/.exec(dto.qrPayload.trim());
      if (!m) {
        await this.logFail(operatorId, operatorName, '', null, clientIp, 1, 'QR_PAYLOAD_INVALID');
        await this.bumpFail(rlKey);
        throw new UnprocessableEntityException({ code: ErrorCode.INVALID_PARAM, detail: 'QR_INVALID' });
      }
      pickupCode = m[2]!;
      verifyMethod = 1;
    }
    if (!pickupCode || !/^\d{6}$/.test(pickupCode)) {
      throw new UnprocessableEntityException({ code: ErrorCode.INVALID_PARAM, detail: 'CODE_FORMAT' });
    }

    const salt = process.env.PICKUP_CODE_SALT ?? 'o2o-grocery-default-salt';
    const hash = createHash('sha256').update(`${pickupCode}${salt}`).digest('hex');
    const order = await this.orderRepo.findOne({ where: { pickupCodeHash: hash } });
    if (!order) {
      await this.logFail(operatorId, operatorName, '', null, clientIp, verifyMethod, 'CODE_NOT_FOUND');
      await this.bumpFail(rlKey);
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'PICKUP_CODE_INVALID',
        message: '提货码无效',
      });
    }

    // 3) 校验店员归属(该店员必须能服务该自提点 — 通过 merchant 校验)
    const point = await this.pointRepo.findOne({ where: { pickupPointId: order.pickupPointId } });
    if (!point) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    if (point.merchantId !== operatorId) {
      await this.logFail(
        operatorId,
        operatorName,
        order.orderNo,
        order.groceryOrderId,
        clientIp,
        verifyMethod,
        'POINT_FORBIDDEN',
      );
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        detail: 'POINT_FORBIDDEN',
        message: '无该自提点的核销权限',
      });
    }

    // 4) 状态校验:必须 PAID_WAIT_PICKUP / SETTLING / DIFF_PAYING(称重期间二次进入)
    if (!['PAID_WAIT_PICKUP', 'SETTLING', 'DIFF_PAYING'].includes(order.status)) {
      await this.logFail(
        operatorId,
        operatorName,
        order.orderNo,
        order.groceryOrderId,
        clientIp,
        verifyMethod,
        `BAD_STATUS:${order.status}`,
      );
      await this.bumpFail(rlKey);
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'BAD_STATUS',
        message: `订单当前状态 ${order.status} 不允许核销`,
      });
    }

    // 5) 5 秒去重:同一店员对同一订单短期不重复
    const dedupKey = `${VERIFY_DEDUP_PREFIX}${order.groceryOrderId}:${operatorId}`;
    const setOk = await this.redis.set(dedupKey, '1', 'EX', VERIFY_DEDUP_TTL, 'NX').catch(() => null);
    if (setOk === null) {
      // 不影响业务,只是去重提示
      this.logger?.debug?.('verify dedup hit');
    }

    // 6) 写成功日志,并把订单标记进入 SETTLING(等待称重 / 直接结算)
    const items = await this.itemRepo.find({ where: { groceryOrderId: order.groceryOrderId } });
    const needsWeighing = items.some((it) => it.pricingMode === 'weighed' && it.actualQuantity == null);
    if (order.status === 'PAID_WAIT_PICKUP') {
      await this.orderRepo.update(
        { groceryOrderId: order.groceryOrderId },
        {
          status: 'SETTLING',
          settlingAt: String(Date.now()),
          verifyOperatorId: operatorId,
          updatedAt: String(Date.now()),
        },
      );
    }
    await this.logRepo.insert({
      groceryOrderId: order.groceryOrderId,
      orderNo: order.orderNo,
      pickupPointId: order.pickupPointId,
      operatorId,
      operatorName,
      verifyMethod,
      result: 1,
      failReason: null,
      clientIp,
      createdAt: String(Date.now()),
    });
    await this.redis.del(rlKey).catch(() => undefined);

    return {
      groceryOrderId: order.groceryOrderId,
      orderNo: order.orderNo,
      status: order.status === 'PAID_WAIT_PICKUP' ? 'SETTLING' : order.status,
      pickupPointId: order.pickupPointId,
      pickupDate: order.pickupDate,
      pickupStartMinute: order.pickupStartMinute,
      pickupEndMinute: order.pickupEndMinute,
      needsWeighing,
      items: items.map((it) => ({
        groceryOrderItemId: it.groceryOrderItemId,
        productId: it.productId,
        productName: it.productName,
        pricingMode: it.pricingMode,
        weightUnit: it.weightUnit,
        unitPrice: it.unitPrice,
        estimatedQuantity: it.estimatedQuantity,
        actualQuantity: it.actualQuantity,
        estimatedSubtotal: it.estimatedSubtotal,
        actualSubtotal: it.actualSubtotal,
      })),
      estimatedPayableAmount: order.estimatedPayableAmount,
      finalPayableAmount: order.finalPayableAmount,
    };
  }

  async logs(operatorId: string, query: VerifyLogsQueryDto): Promise<VerifyLogsPageVo> {
    const pageNo = Math.max(1, Number(query.pageNo) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const qb = this.logRepo.createQueryBuilder('l').where('l.operatorId = :op', { op: operatorId });
    if (query.pickupPointId) qb.andWhere('l.pickupPointId = :pp', { pp: query.pickupPointId });
    if (query.result) qb.andWhere('l.result = :r', { r: Number(query.result) });
    if (query.fromDate && query.toDate) {
      const from = new Date(`${query.fromDate}T00:00:00.000`).getTime();
      const to = new Date(`${query.toDate}T23:59:59.999`).getTime();
      qb.andWhere('CAST(l.createdAt AS UNSIGNED) BETWEEN :f AND :t', { f: from, t: to });
    }
    qb.orderBy('l.createdAt', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    const items: VerifyLogVo[] = list.map((l) => ({
      verifyLogId: l.verifyLogId,
      groceryOrderId: l.groceryOrderId,
      orderNo: l.orderNo,
      pickupPointId: l.pickupPointId,
      operatorId: l.operatorId,
      operatorName: l.operatorName,
      verifyMethod: l.verifyMethod,
      result: l.result,
      failReason: l.failReason,
      createdAt: Number(l.createdAt),
    }));
    return { items, total, pageNo, pageSize };
  }

  // ============= helpers =============

  private get logger() {
    return console;
  }

  private async logFail(
    operatorId: string,
    operatorName: string | null,
    orderNo: string,
    orderId: string | null,
    clientIp: string | null,
    method: number,
    reason: string,
  ): Promise<void> {
    await this.logRepo.insert({
      groceryOrderId: orderId,
      orderNo,
      pickupPointId: '0',
      operatorId,
      operatorName,
      verifyMethod: method,
      result: 0,
      failReason: reason,
      clientIp,
      createdAt: String(Date.now()),
    });
  }

  private async bumpFail(rlKey: string): Promise<void> {
    const cnt = await this.redis.incr(rlKey).catch(() => 0);
    if (cnt === 1) {
      await this.redis.expire(rlKey, VERIFY_RATELIMIT_TTL).catch(() => undefined);
    }
  }
}
