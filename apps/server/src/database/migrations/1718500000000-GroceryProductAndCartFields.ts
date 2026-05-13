import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 为外卖→生鲜改造扩展 product/cart_item 字段。
 *
 * product 新增:
 *   product_type ('food'|'grocery') 区分外卖/生鲜
 *   pricing_mode ('fixed'|'weighed') 一份一价 / 按重计价
 *   weight_unit / min_weight_g / max_weight_g 称重商品的重量约束
 *   unit_price_per_jin 每斤单价(分),称重商品用,优先于 price
 *
 * cart_item 新增:
 *   pricing_mode_snapshot 加购时定价模式快照
 *   estimated_weight_g 用户预估克数(称重商品才用)
 *
 * 全部 ADD COLUMN,无破坏性变更;外卖既有数据 product_type='food' / pricing_mode='fixed'。
 */
export class GroceryProductAndCartFields1718500000000 implements MigrationInterface {
  name = 'GroceryProductAndCartFields1718500000000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE \`product\`
        ADD COLUMN \`product_type\` ENUM('food','grocery') NOT NULL DEFAULT 'food' AFTER \`category_id\`,
        ADD COLUMN \`pricing_mode\` ENUM('fixed','weighed') NOT NULL DEFAULT 'fixed' AFTER \`product_type\`,
        ADD COLUMN \`weight_unit\` VARCHAR(8) NULL COMMENT 'jin/kg/g(仅 weighed)' AFTER \`pricing_mode\`,
        ADD COLUMN \`min_weight_g\` INT NULL COMMENT '最小起售克数' AFTER \`weight_unit\`,
        ADD COLUMN \`max_weight_g\` INT NULL COMMENT '单次上限克数' AFTER \`min_weight_g\`,
        ADD COLUMN \`unit_price_per_jin\` BIGINT NULL COMMENT '单价(分/斤),称重商品用,优先于 price' AFTER \`max_weight_g\`,
        ADD INDEX \`idx_product_type_status\` (\`product_type\`,\`sale_status\`)
    `);

    await qr.query(`
      ALTER TABLE \`cart_item\`
        ADD COLUMN \`pricing_mode_snapshot\` ENUM('fixed','weighed') NOT NULL DEFAULT 'fixed' AFTER \`quantity\`,
        ADD COLUMN \`estimated_weight_g\` INT NULL COMMENT '预估克数(仅 weighed)' AFTER \`pricing_mode_snapshot\`
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE \`cart_item\`
        DROP COLUMN \`estimated_weight_g\`,
        DROP COLUMN \`pricing_mode_snapshot\`
    `);

    await qr.query(`
      ALTER TABLE \`product\`
        DROP INDEX \`idx_product_type_status\`,
        DROP COLUMN \`unit_price_per_jin\`,
        DROP COLUMN \`max_weight_g\`,
        DROP COLUMN \`min_weight_g\`,
        DROP COLUMN \`weight_unit\`,
        DROP COLUMN \`pricing_mode\`,
        DROP COLUMN \`product_type\`
    `);
  }
}
