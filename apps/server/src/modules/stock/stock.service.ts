import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { DataSource, Raw, Repository } from 'typeorm';

import {
  Product,
  type ProductSaleStatus,
  ProductSku,
  StockRecord,
  type StockOperatorType,
  Store,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { StockAlertItemVo } from './stock.dto';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductSku) private readonly skuRepo: Repository<ProductSku>,
    @InjectRepository(StockRecord) private readonly recordRepo: Repository<StockRecord>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
  ) {}

  /**
   * 调整库存(+/-);写流水 + 0 时 sale_status=sold_out + 低于阈值发 stock.low。
   * 注意:此方法不检查 store 归属,由 caller(controller / 其他 service)负责。
   */
  async adjust(
    productId: string,
    skuId: string | null,
    delta: number,
    reason: string,
    operatorId: string,
    operatorType: StockOperatorType,
  ): Promise<{ productId: string; stockAfter: number }> {
    const result = await this.dataSource.transaction(async (em) => {
      const pRepo = em.getRepository(Product);
      const sRepo = em.getRepository(ProductSku);
      const rRepo = em.getRepository(StockRecord);

      const product = await pRepo.findOne({ where: { productId } });
      if (!product) throw new NotFoundException('product not found');
      const stockBefore = product.stock;
      const stockAfter = stockBefore + delta;
      if (stockAfter < 0) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: '库存不可为负',
        });
      }

      // 同步更新 SKU(若指定)
      if (skuId) {
        const sku = await sRepo.findOne({ where: { skuId } });
        if (!sku || sku.productId !== productId) {
          throw new NotFoundException('sku not found');
        }
        const skuAfter = sku.stock + delta;
        if (skuAfter < 0) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            message: 'SKU 库存不可为负',
          });
        }
        await sRepo.update({ skuId }, { stock: skuAfter, updatedAt: String(Date.now()) });
      }

      const newStatus: ProductSaleStatus =
        stockAfter === 0 && product.saleStatus === 'on_shelf' ? 'sold_out' : product.saleStatus;
      await pRepo.update({ productId }, { stock: stockAfter, saleStatus: newStatus, updatedAt: String(Date.now()) });

      await rRepo.insert({
        productId,
        skuId,
        quantityChange: delta,
        reason,
        operatorId,
        operatorType,
        stockBefore,
        stockAfter,
        createdAt: String(Date.now()),
      });

      return {
        product: { ...product, stock: stockAfter, saleStatus: newStatus } as Product,
        stockAfter,
      };
    });

    // 售罄事件(若状态从 on_shelf → sold_out)
    if (result.product.saleStatus === 'sold_out' && result.stockAfter === 0) {
      await this.eventBus.publish(
        EventName.ProductOnSale,
        {
          productId,
          storeId: result.product.storeId,
          saleStatus: 'sold_out',
          changedAt: Date.now(),
        },
        { bizType: 'product', bizId: productId },
      );
    }

    // 库存预警(扣减后低于阈值)
    if (
      delta < 0 &&
      result.product.stockAlertThreshold != null &&
      result.stockAfter < result.product.stockAlertThreshold &&
      result.stockAfter > 0
    ) {
      await this.eventBus.publish(
        EventName.StockLow,
        {
          productId,
          storeId: result.product.storeId,
          currentStock: result.stockAfter,
          threshold: result.product.stockAlertThreshold,
        },
        { bizType: 'stock', bizId: productId },
      );
    }

    return { productId, stockAfter: result.stockAfter };
  }

  async listAlerts(merchantId: string): Promise<StockAlertItemVo[]> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException('店铺不存在');

    const products = await this.productRepo.find({
      where: {
        storeId: store.storeId,
        stock: Raw((alias) => `${alias} < COALESCE(stock_alert_threshold, 5)`),
      },
      order: { stock: 'ASC' },
      take: 200,
    });
    return products.map((p) => ({
      productId: p.productId,
      storeId: p.storeId,
      productName: p.name,
      currentStock: p.stock,
      threshold: p.stockAlertThreshold ?? 5,
    }));
  }

  async setThreshold(
    merchantId: string,
    productId: string,
    threshold: number,
  ): Promise<{ productId: string; threshold: number }> {
    const product = await this.productRepo.findOne({ where: { productId } });
    if (!product) throw new NotFoundException('product not found');
    const store = await this.storeRepo.findOne({ where: { storeId: product.storeId } });
    if (!store || store.merchantId !== merchantId) {
      throw new ForbiddenException('cannot access another store');
    }
    await this.productRepo.update({ productId }, { stockAlertThreshold: threshold, updatedAt: String(Date.now()) });
    return { productId, threshold };
  }
}
