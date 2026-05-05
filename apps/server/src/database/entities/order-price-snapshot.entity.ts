import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { FoodOrderItemSkuSnapshot } from './food-order-item.entity';
import type { FoodOrderAddressSnapshot, FoodOrderDeliveryType } from './food-order.entity';

export interface OrderPriceSnapshotItem {
  skuId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  subTotal: string;
  skuSnapshot: FoodOrderItemSkuSnapshot;
}

export interface OrderPriceSnapshotPayload {
  storeId: string;
  cityCode: string;
  items: OrderPriceSnapshotItem[];
  goodsAmount: string;
  deliveryFee: string;
  discountAmount: string;
  payableAmount: string;
  estimatedDeliveryTime?: number;
  deliveryType: FoodOrderDeliveryType;
  reservedTime?: string | null;
  addressSnapshot: FoodOrderAddressSnapshot;
}

@Entity('order_price_snapshot')
@Index('uk_order_price_snapshot_preview', ['previewId'], { unique: true })
@Index('idx_order_price_snapshot_expires', ['expiresAt'])
export class OrderPriceSnapshot {
  @PrimaryGeneratedColumn({ name: 'order_price_snapshot_id', type: 'bigint' })
  orderPriceSnapshotId!: string;

  @Column({ name: 'preview_id', type: 'varchar', length: 64 })
  previewId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ type: 'json' })
  payload!: OrderPriceSnapshotPayload;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'expires_at', type: 'bigint' })
  expiresAt!: string;
}
