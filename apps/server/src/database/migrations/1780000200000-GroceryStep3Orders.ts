import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GR-3 — 生鲜订单 + 订单项
 *
 * - grocery_order : 自提模式 + 多退少补,完整状态机
 * - grocery_order_item: 行项目,含预估/实际重量与金额
 */
export class GroceryStep3Orders1780000200000 implements MigrationInterface {
  name = 'GroceryStep3Orders1780000200000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`grocery_order\` (
        \`order_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`customer_id\` BIGINT NOT NULL,
        \`pickup_point_id\` BIGINT NOT NULL,
        \`pickup_point_snapshot\` JSON NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'wait_pay',
        \`estimated_amount_cents\` BIGINT NOT NULL,
        \`final_amount_cents\` BIGINT NULL,
        \`weight_delta_cents\` BIGINT NULL,
        \`estimate_payment_order_id\` BIGINT NULL,
        \`delta_payment_order_id\` BIGINT NULL,
        \`delta_refund_order_id\` BIGINT NULL,
        \`pickup_code\` VARCHAR(8) NULL,
        \`paid_at\` BIGINT NULL,
        \`picking_started_at\` BIGINT NULL,
        \`weigh_settled_at\` BIGINT NULL,
        \`pickup_ready_at\` BIGINT NULL,
        \`picked_up_at\` BIGINT NULL,
        \`cancelled_at\` BIGINT NULL,
        \`cancel_reason\` VARCHAR(255) NULL,
        \`remark\` VARCHAR(255) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`order_id\`),
        KEY \`idx_grocery_order_customer\` (\`customer_id\`),
        KEY \`idx_grocery_order_status\` (\`status\`),
        KEY \`idx_grocery_order_pickup\` (\`pickup_point_id\`),
        KEY \`idx_grocery_order_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-3 平台自营生鲜订单';
    `);
    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`grocery_order_item\` (
        \`item_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_id\` BIGINT NOT NULL,
        \`product_id\` BIGINT NOT NULL,
        \`product_name_snapshot\` VARCHAR(128) NOT NULL,
        \`is_weighted\` TINYINT NOT NULL DEFAULT 1,
        \`unit_price_cents_per_jin\` BIGINT NOT NULL,
        \`estimated_per_portion_grams\` INT NOT NULL,
        \`portions\` INT NOT NULL,
        \`estimated_weight_grams\` INT NOT NULL,
        \`estimated_line_cents\` BIGINT NOT NULL,
        \`final_weight_grams\` INT NULL,
        \`final_line_cents\` BIGINT NULL,
        \`bound_qrcode_ids\` JSON NULL,
        \`has_traceability\` TINYINT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`item_id\`),
        KEY \`idx_grocery_order_item_order\` (\`order_id\`),
        KEY \`idx_grocery_order_item_product\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-3 生鲜订单项';
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `grocery_order_item`');
    await qr.query('DROP TABLE IF EXISTS `grocery_order`');
  }
}
