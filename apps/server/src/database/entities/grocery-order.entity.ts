import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 生鲜订单(GR-3)— 自提模式 + 估重预付 + 多退少补
 *
 * 状态机:
 *   wait_pay → paid → picking → weigh_settled → pickup_ready → picked_up
 *   wait_pay → cancelled (15min 超时 / 用户取消)
 *   paid → cancelled (用户/系统在拣货前取消)
 *   picking → refunded (缺货全退)
 *   weigh_settled → cancelled (补付 15min 超时)
 */
@Entity('grocery_order')
@Index('idx_grocery_order_customer', ['customerId'])
@Index('idx_grocery_order_status', ['status'])
@Index('idx_grocery_order_pickup', ['pickupPointId'])
@Index('idx_grocery_order_created', ['createdAt'])
export class GroceryOrder {
  @PrimaryGeneratedColumn({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'pickup_point_id', type: 'bigint' })
  pickupPointId!: string;

  /** 下单时锁的自提点快照(name/address) */
  @Column({ name: 'pickup_point_snapshot', type: 'json', nullable: true })
  pickupPointSnapshot!: { name: string; address: string; contactPhone?: string | null } | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: 'wait_pay',
  })
  status!: 'wait_pay' | 'paid' | 'picking' | 'weigh_settled' | 'pickup_ready' | 'picked_up' | 'cancelled' | 'refunded';

  /** 下单时预估总价(分) */
  @Column({ name: 'estimated_amount_cents', type: 'bigint' })
  estimatedAmountCents!: string;

  /** 拣货称重后真实总价(分);weigh_settled 前为 null */
  @Column({ name: 'final_amount_cents', type: 'bigint', nullable: true })
  finalAmountCents!: string | null;

  /** final - estimated;正=补付,负=退款 */
  @Column({ name: 'weight_delta_cents', type: 'bigint', nullable: true })
  weightDeltaCents!: string | null;

  /** 估价支付单 ID */
  @Column({ name: 'estimate_payment_order_id', type: 'bigint', nullable: true })
  estimatePaymentOrderId!: string | null;

  /** 差额补付支付单 ID(若 delta > 0) */
  @Column({ name: 'delta_payment_order_id', type: 'bigint', nullable: true })
  deltaPaymentOrderId!: string | null;

  /** 差额退款单 ID(若 delta < 0) */
  @Column({ name: 'delta_refund_order_id', type: 'bigint', nullable: true })
  deltaRefundOrderId!: string | null;

  /** 6 位自提核销码,pickup_ready 后生成 */
  @Column({ name: 'pickup_code', type: 'varchar', length: 8, nullable: true })
  pickupCode!: string | null;

  @Column({ name: 'paid_at', type: 'bigint', nullable: true })
  paidAt!: string | null;

  @Column({ name: 'picking_started_at', type: 'bigint', nullable: true })
  pickingStartedAt!: string | null;

  @Column({ name: 'weigh_settled_at', type: 'bigint', nullable: true })
  weighSettledAt!: string | null;

  @Column({ name: 'pickup_ready_at', type: 'bigint', nullable: true })
  pickupReadyAt!: string | null;

  @Column({ name: 'picked_up_at', type: 'bigint', nullable: true })
  pickedUpAt!: string | null;

  @Column({ name: 'cancelled_at', type: 'bigint', nullable: true })
  cancelledAt!: string | null;

  @Column({ name: 'cancel_reason', type: 'varchar', length: 255, nullable: true })
  cancelReason!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
