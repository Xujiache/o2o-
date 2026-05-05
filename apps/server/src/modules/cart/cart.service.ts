import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { In, Repository } from 'typeorm';

import { CartItem, Product, ProductSku, Store } from '../../database/entities';

import { type CartLineVo, type CartVo, type UpsertCartItemDto } from './cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem) private readonly cartRepo: Repository<CartItem>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductSku) private readonly skuRepo: Repository<ProductSku>,
  ) {}

  async upsertItem(customerId: string, dto: UpsertCartItemDto): Promise<CartVo> {
    const store = await this.storeRepo.findOne({ where: { storeId: dto.storeId } });
    if (!store) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'store not found' });
    if (store.businessStatus !== 'online') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'STORE_NOT_OPEN',
        message: '店铺当前未营业',
      });
    }

    const sku = await this.skuRepo.findOne({ where: { skuId: dto.skuId } });
    if (!sku) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'sku not found' });
    const product = await this.productRepo.findOne({ where: { productId: sku.productId } });
    if (!product || product.storeId !== dto.storeId) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'SKU_STORE_MISMATCH',
        message: 'sku 不属于该店铺',
      });
    }
    if (product.saleStatus !== 'on_shelf') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'PRODUCT_NOT_ON_SHELF',
        message: '商品未上架',
      });
    }

    const now = String(Date.now());
    const existing = await this.cartRepo.findOne({
      where: { customerId, storeId: dto.storeId, skuId: dto.skuId },
    });

    if (dto.quantity === 0) {
      if (existing) await this.cartRepo.delete({ cartItemId: existing.cartItemId });
    } else if (existing) {
      await this.cartRepo.update({ cartItemId: existing.cartItemId }, { quantity: dto.quantity, updatedAt: now });
    } else {
      await this.cartRepo.insert({
        customerId,
        storeId: dto.storeId,
        skuId: dto.skuId,
        quantity: dto.quantity,
        createdAt: now,
        updatedAt: now,
      });
    }

    return this.getCart(customerId, dto.storeId);
  }

  async getCart(customerId: string, storeId: string): Promise<CartVo> {
    const items = await this.cartRepo.find({ where: { customerId, storeId } });
    const store = await this.storeRepo.findOne({ where: { storeId } });
    if (!store) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'store not found' });

    if (items.length === 0) {
      return {
        storeId,
        items: [],
        goodsAmount: '0',
        deliveryFee: '0',
        discountAmount: '0',
        totalAmount: '0',
      };
    }

    const skuIds = items.map((i) => i.skuId);
    const skus = await this.skuRepo.find({ where: { skuId: In(skuIds) } });
    const productIds = Array.from(new Set(skus.map((s) => s.productId)));
    const products = await this.productRepo.find({ where: { productId: In(productIds) } });
    const productMap = new Map(products.map((p) => [p.productId, p]));
    const skuMap = new Map(skus.map((s) => [s.skuId, s]));

    let goods = BigInt(0);
    const lines: CartLineVo[] = items.map((it) => {
      const sku = skuMap.get(it.skuId)!;
      const product = sku ? productMap.get(sku.productId) : undefined;
      const price = sku ? BigInt(sku.price) : BigInt(0);
      const sub = price * BigInt(it.quantity);
      goods += sub;
      return {
        cartItemId: it.cartItemId,
        skuId: it.skuId,
        productId: sku?.productId ?? '0',
        name: product?.name ?? '已下架商品',
        specValue: sku?.specValue ?? '',
        unitPrice: String(price),
        quantity: it.quantity,
        subTotal: String(sub),
      };
    });

    const deliveryFee = BigInt(store.deliveryFee || '0');
    const total = goods + deliveryFee;
    return {
      storeId,
      items: lines,
      goodsAmount: String(goods),
      deliveryFee: String(deliveryFee),
      discountAmount: '0',
      totalAmount: String(total),
    };
  }
}
