import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, In, Repository } from 'typeorm';

import { GroceryOrder, GroceryOrderItem, PickupPoint, PickupTimeSlot, Product } from '../../database/entities';
import { AdminRefundService } from '../admin-refund/admin-refund.service';

import type {
  ConfirmSettleDto,
  ConfirmSettleVo,
  FinalizeDto,
  FinalizeVo,
  WeighItemsDto,
  WeighItemsVo,
} from './grocery-weigh.dto';

/** ±10% 浮动免打扰阈值 */
const SETTLE_AUTO_TOLERANCE_PCT = 10;

@Injectable()
export class GroceryWeighService {
  constructor(
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
    @InjectRepository(GroceryOrderItem) private readonly itemRepo: Repository<GroceryOrderItem>,
    @InjectRepository(PickupPoint) private readonly pointRepo: Repository<PickupPoint>,
    @InjectRepository(PickupTimeSlot) private readonly slotRepo: Repository<PickupTimeSlot>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
    private readonly adminRefundService: AdminRefundService,
  ) {}

  private async ensureMerchantOwns(merchantId: string, orderId: string): Promise<GroceryOrder> {
    const o = await this.orderRepo.findOne({ where: { groceryOrderId: orderId } });
    if (!o) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    if (o.merchantId !== merchantId) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN });
    return o;
  }

  async weighItems(merchantId: string, operatorId: string, dto: WeighItemsDto): Promise<WeighItemsVo> {
    const o = await this.ensureMerchantOwns(merchantId, dto.groceryOrderId);
    if (!['SETTLING'].includes(o.status)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'NOT_IN_SETTLING',
        message: '订单尚未进入称重阶段',
      });
    }

    const itemIds = dto.items.map((i) => i.groceryOrderItemId);
    const items = await this.itemRepo.find({
      where: { groceryOrderItemId: In(itemIds), groceryOrderId: dto.groceryOrderId },
    });
    if (items.length !== itemIds.length) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'ITEM_NOT_FOUND' });
    }
    const itemMap = new Map(items.map((it) => [it.groceryOrderItemId, it]));
    const productIds = Array.from(new Set(items.map((it) => it.productId)));
    const products = await this.productRepo.find({ where: { productId: In(productIds) } });
    const pMap = new Map(products.map((p) => [p.productId, p]));

    const now = String(Date.now());
    const results: WeighItemsVo['items'] = [];

    await this.dataSource.transaction(async (em) => {
      for (const w of dto.items) {
        const it = itemMap.get(w.groceryOrderItemId)!;
        if (it.pricingMode !== 'weighed') {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'NOT_WEIGHED_ITEM',
            message: `${it.productName} 是定价商品,无需称重`,
          });
        }
        const p = pMap.get(it.productId);
        if (p?.minWeightG && w.actualG < p.minWeightG) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'BELOW_MIN_WEIGHT',
            message: `${it.productName} 起售 ${p.minWeightG}g`,
          });
        }
        const unitPrice = BigInt(it.unitPrice);
        const actualSubtotal = (unitPrice * BigInt(w.actualG)) / BigInt(500);
        await em.getRepository(GroceryOrderItem).update(
          { groceryOrderItemId: it.groceryOrderItemId },
          {
            actualQuantity: w.actualG,
            actualSubtotal: String(actualSubtotal),
            weighedAt: now,
            weighedBy: operatorId,
          },
        );
        results.push({
          groceryOrderItemId: it.groceryOrderItemId,
          actualQuantity: w.actualG,
          actualSubtotal: String(actualSubtotal),
        });
      }
    });

    // 重算订单 final amount(fixed 项 actual = estimated)
    const allItems = await this.itemRepo.find({ where: { groceryOrderId: dto.groceryOrderId } });
    let goods = BigInt(0);
    for (const it of allItems) {
      const sub =
        it.pricingMode === 'weighed' ? BigInt(it.actualSubtotal ?? it.estimatedSubtotal) : BigInt(it.estimatedSubtotal);
      goods += sub;
    }
    const discount = BigInt(o.discountAmount);
    const payable = goods - discount;
    const estimatedPayable = BigInt(o.estimatedPayableAmount);
    const diff = payable - estimatedPayable;
    await this.orderRepo.update(
      { groceryOrderId: dto.groceryOrderId },
      {
        finalGoodsAmount: String(goods),
        finalPayableAmount: String(payable),
        diffAmount: String(diff),
        updatedAt: now,
      },
    );

    return {
      groceryOrderId: dto.groceryOrderId,
      items: results,
      finalGoodsAmount: String(goods),
      finalPayableAmount: String(payable),
      diffAmount: String(diff),
    };
  }

  async confirmSettle(merchantId: string, dto: ConfirmSettleDto): Promise<ConfirmSettleVo> {
    const o = await this.ensureMerchantOwns(merchantId, dto.groceryOrderId);
    if (o.status !== 'SETTLING') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'NOT_IN_SETTLING',
      });
    }
    // 全部称重商品必须都已录入实际重量
    const items = await this.itemRepo.find({ where: { groceryOrderId: o.groceryOrderId } });
    const unweighed = items.find((it) => it.pricingMode === 'weighed' && it.actualQuantity == null);
    if (unweighed) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'WEIGH_INCOMPLETE',
        message: `${unweighed.productName} 尚未称重`,
      });
    }

    const finalPayable = BigInt(o.finalPayableAmount ?? '0');
    const estPayable = BigInt(o.estimatedPayableAmount);
    const diff = finalPayable - estPayable;
    const pct = estPayable === 0n ? 100 : Number(((diff < 0n ? -diff : diff) * 10000n) / estPayable) / 100; // %
    const now = String(Date.now());

    let action: ConfirmSettleVo['action'];
    let status: GroceryOrder['status'];

    if (diff === 0n || pct <= SETTLE_AUTO_TOLERANCE_PCT) {
      // 自动通过:差额自动处理(若 diff<0 触发自动退款;若 0<diff<=10% 视为浮动,不再补付)
      if (diff < 0n) {
        // 自动退差价
        await this.adminRefundService.createFromArbitration({
          bizType: 'GROCERY',
          bizOrderId: o.groceryOrderId,
          paymentOrderId: null,
          amount: String(-diff),
          provider: 'wxpay',
        });
        action = 'AUTO_REFUND';
      } else {
        action = 'AUTO_DONE';
      }
      status = 'PICKED_UP';
      await this.orderRepo.update(
        { groceryOrderId: o.groceryOrderId },
        {
          status,
          settledAt: now,
          pickedUpAt: now,
          diffPayStatus: diff === 0n ? 'none' : diff < 0n ? 'refunded' : 'none',
          updatedAt: now,
        },
      );
    } else if (diff < 0n) {
      // 超过 10% 但金额是退款:仍自动退,客户无需操作
      await this.adminRefundService.createFromArbitration({
        bizType: 'GROCERY',
        bizOrderId: o.groceryOrderId,
        paymentOrderId: null,
        amount: String(-diff),
        provider: 'wxpay',
      });
      action = 'AUTO_REFUND';
      status = 'PICKED_UP';
      await this.orderRepo.update(
        { groceryOrderId: o.groceryOrderId },
        {
          status,
          settledAt: now,
          pickedUpAt: now,
          diffPayStatus: 'refunded',
          updatedAt: now,
        },
      );
    } else {
      // 需要客户补付差价 — 状态 DIFF_PAYING,等用户客户端发起补付
      await this.orderRepo.update(
        { groceryOrderId: o.groceryOrderId },
        {
          status: 'DIFF_PAYING',
          settledAt: now,
          diffPayStatus: 'unpaid',
          updatedAt: now,
        },
      );
      action = 'NEEDS_DIFF_PAY';
      status = 'DIFF_PAYING';
    }

    return {
      groceryOrderId: o.groceryOrderId,
      finalPayableAmount: o.finalPayableAmount ?? String(finalPayable),
      diffAmount: String(diff),
      action,
      status,
    };
  }

  async finalize(merchantId: string, dto: FinalizeDto): Promise<FinalizeVo> {
    const o = await this.ensureMerchantOwns(merchantId, dto.groceryOrderId);
    if (o.status === 'PICKED_UP' || o.status === 'COMPLETED') {
      return { groceryOrderId: o.groceryOrderId, status: o.status };
    }
    if (o.status !== 'DIFF_PAYING') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'NOT_DIFF_PAYING',
        message: '订单不在补付完成态,无法标记提货',
      });
    }
    if (o.diffPayStatus !== 'paid') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'DIFF_NOT_PAID',
        message: '差价未完成支付,无法标记提货',
      });
    }
    const now = String(Date.now());
    await this.orderRepo.update(
      { groceryOrderId: o.groceryOrderId },
      { status: 'PICKED_UP', pickedUpAt: now, updatedAt: now },
    );
    return { groceryOrderId: o.groceryOrderId, status: 'PICKED_UP' };
  }
}
