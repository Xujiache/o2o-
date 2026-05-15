import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 生鲜订单项(GR-3)
 *
 * - 一个订单 N 个 item,每个 item 一种商品 N 份
 * - estimated_weight_grams = portions × product.estimated_weight_grams
 * - final_weight_grams 在拣货称重时回写
 * - bound_qrcode_ids 在称重时绑定的一鸡一码二维码 ID 列表(仅 has_traceability=1 的商品)
 */
@Entity('grocery_order_item')
@Index('idx_grocery_order_item_order', ['orderId'])
@Index('idx_grocery_order_item_product', ['productId'])
export class GroceryOrderItem {
  @PrimaryGeneratedColumn({ name: 'item_id', type: 'bigint' })
  itemId!: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: string;

  /** 下单时商品名快照 */
  @Column({ name: 'product_name_snapshot', type: 'varchar', length: 128 })
  productNameSnapshot!: string;

  /** GR-7+: 选中的 SKU ID(仅 priced_by='sku' 时非空) */
  @Column({ name: 'sku_id', type: 'bigint', nullable: true })
  skuId!: string | null;

  /** GR-7+: 下单时 SKU 规格名快照(如「整鸡」「切块」),非 sku 商品为 null */
  @Column({ name: 'sku_spec_snapshot', type: 'varchar', length: 255, nullable: true })
  skuSpecSnapshot!: string | null;

  /** 1=按斤;0=按件/SKU(下单后无须再称重) */
  @Column({ name: 'is_weighted', type: 'tinyint', default: 1 })
  isWeighted!: number;

  /** 下单时锁的单价(分/斤) */
  @Column({ name: 'unit_price_cents_per_jin', type: 'bigint' })
  unitPriceCentsPerJin!: string;

  /** 下单时商家给的每份预估克数(快照) */
  @Column({ name: 'estimated_per_portion_grams', type: 'int' })
  estimatedPerPortionGrams!: number;

  /** 用户选的份数 */
  @Column({ type: 'int' })
  portions!: number;

  /** 估算总克数 = portions × estimated_per_portion_grams */
  @Column({ name: 'estimated_weight_grams', type: 'int' })
  estimatedWeightGrams!: number;

  /** 估价总分 = unit_price_cents_per_jin × estimated_weight_grams / 500 */
  @Column({ name: 'estimated_line_cents', type: 'bigint' })
  estimatedLineCents!: string;

  /** 实际称重克数,拣货后回写 */
  @Column({ name: 'final_weight_grams', type: 'int', nullable: true })
  finalWeightGrams!: number | null;

  /** 实际总分 = unit_price_cents_per_jin × final_weight_grams / 500 */
  @Column({ name: 'final_line_cents', type: 'bigint', nullable: true })
  finalLineCents!: string | null;

  /** 绑定的一鸡一码二维码 ID 列表(JSON) */
  @Column({ name: 'bound_qrcode_ids', type: 'json', nullable: true })
  boundQrcodeIds!: string[] | null;

  @Column({ name: 'has_traceability', type: 'tinyint', default: 0 })
  hasTraceability!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
