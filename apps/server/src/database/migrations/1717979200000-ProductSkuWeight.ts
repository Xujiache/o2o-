import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * product_sku 加 weight_grams 列.
 *
 * 业务规则:
 *  - NULL = 该 SKU 不按重量销售(普通件装,商家未勾选)
 *  - 数字 = 商家明确填写的规格重量(克),前端展示 "500g" 或 "1.2kg"
 *
 * 不影响价格逻辑 — SKU.price 仍为整袋/整份的固定价,
 * 不做"按 g 动态计价"(那是后续阶段事情).
 */
export class ProductSkuWeight1717979200000 implements MigrationInterface {
  name = 'ProductSkuWeight1717979200000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      "ALTER TABLE `product_sku` ADD COLUMN `weight_grams` INT NULL COMMENT '规格重量(克),NULL=不按重量销售' AFTER `stock_locked`",
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('ALTER TABLE `product_sku` DROP COLUMN `weight_grams`');
  }
}
