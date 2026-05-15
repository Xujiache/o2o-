import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GR-7+ — 生鲜订单项加 SKU 字段（支持 priced_by='sku' 的下单）
 *
 * 1) ALTER `grocery_order_item` 加 2 列:
 *    - sku_id            BIGINT NULL  — 选中的 SKU(仅 sku 商品非空)
 *    - sku_spec_snapshot VARCHAR(255) NULL — 下单时规格名快照
 *
 * 旧字段全部保留;sku 商品下单时 is_weighted=0,称重流程自动跳过。
 */
export class GroceryStep7OrderItemSku1780000500000 implements MigrationInterface {
  name = 'GroceryStep7OrderItemSku1780000500000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE \`grocery_order_item\`
        ADD COLUMN \`sku_id\` BIGINT NULL AFTER \`product_name_snapshot\`,
        ADD COLUMN \`sku_spec_snapshot\` VARCHAR(255) NULL AFTER \`sku_id\`,
        ADD INDEX \`idx_grocery_order_item_sku\` (\`sku_id\`)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE \`grocery_order_item\`
        DROP INDEX \`idx_grocery_order_item_sku\`,
        DROP COLUMN \`sku_spec_snapshot\`,
        DROP COLUMN \`sku_id\`
    `);
  }
}
