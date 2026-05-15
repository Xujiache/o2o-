import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GR-6 — 生鲜商品 V2 扩展(详情页重构)
 *
 * 1) ALTER `grocery_product` 加 6 个新列:
 *    - main_image_file_ids   JSON   多张主图(<=10)
 *    - detail_image_file_ids JSON   多张详情图(<=20)
 *    - tags                  JSON   商品标签数组
 *    - priced_by             VARCHAR 定价模式 weight/piece/sku
 *    - delivery_methods      JSON   物流方式数组
 *    - price_display_rule    VARCHAR 价格显示规则 starting/range/uniform
 * 2) CREATE `grocery_product_sku`:
 *    - 一商品多规格,单 SKU 独立价格 + 独立库存
 *    - 唯一索引 (product_id, spec_value)
 *
 * 旧字段 `cover_image_file_id` / `unit_price_cents_per_jin` / `stock_jin` 保留,
 * 兼容老数据,服务层做 fallback。
 */
export class GroceryStep6ProductV21780000400000 implements MigrationInterface {
  name = 'GroceryStep6ProductV21780000400000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE \`grocery_product\`
        ADD COLUMN \`main_image_file_ids\` JSON NULL AFTER \`cover_image_file_id\`,
        ADD COLUMN \`detail_image_file_ids\` JSON NULL AFTER \`main_image_file_ids\`,
        ADD COLUMN \`tags\` JSON NULL AFTER \`description\`,
        ADD COLUMN \`priced_by\` VARCHAR(16) NOT NULL DEFAULT 'weight' AFTER \`is_weighted\`,
        ADD COLUMN \`delivery_methods\` JSON NULL AFTER \`stock_jin\`,
        ADD COLUMN \`price_display_rule\` VARCHAR(16) NOT NULL DEFAULT 'starting' AFTER \`delivery_methods\`
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`grocery_product_sku\` (
        \`sku_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`product_id\` BIGINT NOT NULL,
        \`spec_value\` VARCHAR(255) NOT NULL,
        \`price_cents\` BIGINT NOT NULL,
        \`stock_jin\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`weight_grams\` INT NULL,
        \`display_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`sku_id\`),
        UNIQUE KEY \`uk_grocery_product_sku\` (\`product_id\`, \`spec_value\`),
        KEY \`idx_grocery_product_sku_product\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-6 生鲜商品规格 SKU';
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `grocery_product_sku`');
    await qr.query(`
      ALTER TABLE \`grocery_product\`
        DROP COLUMN \`main_image_file_ids\`,
        DROP COLUMN \`detail_image_file_ids\`,
        DROP COLUMN \`tags\`,
        DROP COLUMN \`priced_by\`,
        DROP COLUMN \`delivery_methods\`,
        DROP COLUMN \`price_display_rule\`
    `);
  }
}
