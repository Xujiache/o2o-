import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GR-2 — 平台自营生鲜分类 + 按斤计价商品表
 *
 * - grocery_category: 平台级全局分类(无 store)
 * - grocery_product : 单品,按斤计价
 *   - unit_price_cents_per_jin BIGINT 分/斤
 *   - estimated_weight_grams INT 每份预估克数
 *   - stock_jin DECIMAL(10,2) 库存按斤
 *   - has_traceability TINYINT 1=必须绑一鸡一码二维码(如鸡)
 */
export class GroceryStep2Products1780000100000 implements MigrationInterface {
  name = 'GroceryStep2Products1780000100000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`grocery_category\` (
        \`category_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(64) NOT NULL,
        \`icon_file_id\` BIGINT NULL,
        \`display_order\` INT NOT NULL DEFAULT 0,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`category_id\`),
        KEY \`idx_grocery_category_status\` (\`status\`),
        KEY \`idx_grocery_category_order\` (\`display_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-2 生鲜分类';
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`grocery_product\` (
        \`product_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`category_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(128) NOT NULL,
        \`cover_image_file_id\` BIGINT NULL,
        \`description\` TEXT NULL,
        \`is_weighted\` TINYINT NOT NULL DEFAULT 1,
        \`unit_price_cents_per_jin\` BIGINT NOT NULL,
        \`estimated_weight_grams\` INT NOT NULL DEFAULT 500,
        \`stock_jin\` DECIMAL(10,2) NOT NULL DEFAULT 0,
        \`sale_status\` VARCHAR(32) NOT NULL DEFAULT 'on_shelf',
        \`has_traceability\` TINYINT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`product_id\`),
        KEY \`idx_grocery_product_category\` (\`category_id\`),
        KEY \`idx_grocery_product_status\` (\`sale_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-2 平台自营生鲜商品(按斤计价)';
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `grocery_product`');
    await qr.query('DROP TABLE IF EXISTS `grocery_category`');
  }
}
