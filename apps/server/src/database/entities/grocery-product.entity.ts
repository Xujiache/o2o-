import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 生鲜商品(GR-2 + GR-6 V2)— 平台自营
 *
 *  - 旧字段 cover_image_file_id / unit_price_cents_per_jin / stock_jin / estimated_weight_grams 保留
 *    GR-6 加入: 多主图 / 多详情图 / 商品标签 / 定价模式 / 物流方式 / 价格显示规则 / SKU 表
 *  - priced_by:
 *      - weight (默认): 按斤计价,使用 unit_price_cents_per_jin + estimated_weight_grams
 *      - piece        : 按件计价,unit_price_cents_per_jin 视为单件价,stock_jin 视为件数
 *      - sku          : 多规格,逐 SKU 独立 price+stock,见 grocery_product_sku
 *  - price_display_rule:
 *      - starting: 「¥X 起」
 *      - range:    「¥X ~ ¥Y」
 *      - uniform:  「¥X」
 *  - has_traceability=1 标记必须绑定二维码的 SKU(如鸡)
 */
export const GROCERY_PRICED_BY = ['weight', 'piece', 'sku'] as const;
export type GroceryPricedBy = (typeof GROCERY_PRICED_BY)[number];

export const GROCERY_PRICE_DISPLAY_RULES = ['starting', 'range', 'uniform'] as const;
export type GroceryPriceDisplayRule = (typeof GROCERY_PRICE_DISPLAY_RULES)[number];

export const GROCERY_DELIVERY_METHODS = ['self_pickup', 'city_delivery', 'express', 'pickup_point'] as const;
export type GroceryDeliveryMethod = (typeof GROCERY_DELIVERY_METHODS)[number];

@Entity('grocery_product')
@Index('idx_grocery_product_category', ['categoryId'])
@Index('idx_grocery_product_status', ['saleStatus'])
export class GroceryProduct {
  @PrimaryGeneratedColumn({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'category_id', type: 'bigint' })
  categoryId!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ name: 'cover_image_file_id', type: 'bigint', nullable: true })
  coverImageFileId!: string | null;

  /** 主图列表(<=10),JSON 数组存 fileId 字符串 */
  @Column({ name: 'main_image_file_ids', type: 'json', nullable: true })
  mainImageFileIds!: string[] | null;

  /** 详情图列表(<=20),JSON 数组存 fileId 字符串 */
  @Column({ name: 'detail_image_file_ids', type: 'json', nullable: true })
  detailImageFileIds!: string[] | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** 商品标签(JSON string[],<=8 个) */
  @Column({ type: 'json', nullable: true })
  tags!: string[] | null;

  /** 1=按斤计价,0=按件(GR 阶段全 1,留接口) */
  @Column({ name: 'is_weighted', type: 'tinyint', default: 1 })
  isWeighted!: number;

  /** 定价模式 weight / piece / sku */
  @Column({ name: 'priced_by', type: 'varchar', length: 16, default: 'weight' })
  pricedBy!: GroceryPricedBy;

  /** 单价:分/斤(weight 模式) 或 单价:分/件(piece 模式);sku 模式忽略 */
  @Column({ name: 'unit_price_cents_per_jin', type: 'bigint' })
  unitPriceCentsPerJin!: string;

  /** 每份预估重量(克) */
  @Column({ name: 'estimated_weight_grams', type: 'int', default: 500 })
  estimatedWeightGrams!: number;

  /** 库存(斤或件,DECIMAL 10,2);sku 模式忽略,以 SKU 之和为准 */
  @Column({ name: 'stock_jin', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockJin!: string;

  /** 物流方式多选(JSON string[]),GroceryDeliveryMethod 子集 */
  @Column({ name: 'delivery_methods', type: 'json', nullable: true })
  deliveryMethods!: GroceryDeliveryMethod[] | null;

  /** 价格显示规则 */
  @Column({ name: 'price_display_rule', type: 'varchar', length: 16, default: 'starting' })
  priceDisplayRule!: GroceryPriceDisplayRule;

  @Column({ name: 'sale_status', type: 'varchar', length: 32, default: 'on_shelf' })
  saleStatus!: 'on_shelf' | 'off_shelf' | 'sold_out';

  /** 1=需绑定一鸡一码二维码(售出时必填),0=无需溯源 */
  @Column({ name: 'has_traceability', type: 'tinyint', default: 0 })
  hasTraceability!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
