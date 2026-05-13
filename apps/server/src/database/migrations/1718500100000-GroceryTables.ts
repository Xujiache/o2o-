import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 生鲜商城 + 溯源 9 张新表。
 *
 * 与外卖既有 food_order/food_order_item 物理隔离;
 * 与跑腿表 errand_* 完全解耦;
 * payment_order / refund_order / order_review 通过 bizType 复用。
 */
export class GroceryTables1718500100000 implements MigrationInterface {
  name = 'GroceryTables1718500100000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE \`pickup_point\` (
        \`pickup_point_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`merchant_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NULL,
        \`name\` VARCHAR(64) NOT NULL,
        \`phone\` VARCHAR(20) NOT NULL,
        \`province\` VARCHAR(32) NOT NULL,
        \`city\` VARCHAR(32) NOT NULL,
        \`district\` VARCHAR(32) NOT NULL,
        \`address\` VARCHAR(255) NOT NULL,
        \`lng\` DECIMAL(10,6) NOT NULL,
        \`lat\` DECIMAL(10,6) NOT NULL,
        \`geohash\` VARCHAR(12) NOT NULL,
        \`status\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`pickup_point_id\`),
        KEY \`idx_pickup_point_merchant\` (\`merchant_id\`),
        KEY \`idx_pickup_point_geohash\` (\`geohash\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自提点'
    `);

    await qr.query(`
      CREATE TABLE \`pickup_time_slot\` (
        \`slot_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`pickup_point_id\` BIGINT NOT NULL,
        \`slot_date\` DATE NOT NULL,
        \`start_minute\` SMALLINT NOT NULL,
        \`end_minute\` SMALLINT NOT NULL,
        \`capacity\` INT NOT NULL,
        \`reserved\` INT NOT NULL DEFAULT 0,
        \`status\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`slot_id\`),
        UNIQUE KEY \`uk_pickup_slot_unique\` (\`pickup_point_id\`,\`slot_date\`,\`start_minute\`),
        KEY \`idx_pickup_slot_date\` (\`slot_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='自提时段'
    `);

    await qr.query(`
      CREATE TABLE \`grocery_order\` (
        \`grocery_order_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_no\` VARCHAR(32) NOT NULL,
        \`customer_id\` BIGINT NOT NULL,
        \`merchant_id\` BIGINT NOT NULL,
        \`pickup_point_id\` BIGINT NOT NULL,
        \`pickup_slot_id\` BIGINT NOT NULL,
        \`pickup_date\` DATE NOT NULL,
        \`pickup_start_minute\` SMALLINT NOT NULL,
        \`pickup_end_minute\` SMALLINT NOT NULL,
        \`pickup_code\` VARCHAR(8) NULL,
        \`pickup_code_hash\` CHAR(64) NULL,
        \`status\` VARCHAR(24) NOT NULL DEFAULT 'WAIT_PAY',
        \`pay_status\` VARCHAR(16) NOT NULL DEFAULT 'unpaid',
        \`estimated_goods_amount\` BIGINT NOT NULL,
        \`discount_amount\` BIGINT NOT NULL DEFAULT 0,
        \`estimated_payable_amount\` BIGINT NOT NULL,
        \`paid_amount\` BIGINT NULL,
        \`final_goods_amount\` BIGINT NULL,
        \`final_payable_amount\` BIGINT NULL,
        \`diff_amount\` BIGINT NULL,
        \`diff_pay_status\` VARCHAR(16) NULL,
        \`coupon_id\` BIGINT NULL,
        \`expire_at\` BIGINT NOT NULL,
        \`paid_at\` BIGINT NULL,
        \`settling_at\` BIGINT NULL,
        \`settled_at\` BIGINT NULL,
        \`picked_up_at\` BIGINT NULL,
        \`completed_at\` BIGINT NULL,
        \`cancelled_at\` BIGINT NULL,
        \`cancelled_by\` VARCHAR(16) NULL,
        \`cancel_reason\` VARCHAR(255) NULL,
        \`remark\` VARCHAR(512) NULL,
        \`verify_operator_id\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`grocery_order_id\`),
        UNIQUE KEY \`uk_grocery_order_no\` (\`order_no\`),
        KEY \`idx_grocery_order_customer_status\` (\`customer_id\`,\`status\`,\`created_at\`),
        KEY \`idx_grocery_order_merchant_status\` (\`merchant_id\`,\`status\`,\`created_at\`),
        KEY \`idx_grocery_order_pickup\` (\`pickup_point_id\`,\`pickup_date\`,\`status\`),
        KEY \`idx_grocery_order_pickup_code_hash\` (\`pickup_code_hash\`),
        KEY \`idx_grocery_order_expire\` (\`expire_at\`,\`pay_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生鲜订单'
    `);

    await qr.query(`
      CREATE TABLE \`grocery_order_item\` (
        \`grocery_order_item_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`grocery_order_id\` BIGINT NOT NULL,
        \`product_id\` BIGINT NOT NULL,
        \`sku_id\` BIGINT NULL,
        \`product_name\` VARCHAR(128) NOT NULL,
        \`cover_image_file_id\` VARCHAR(64) NULL,
        \`pricing_mode\` ENUM('fixed','weighed') NOT NULL,
        \`weight_unit\` VARCHAR(8) NULL,
        \`unit_price\` BIGINT NOT NULL,
        \`estimated_quantity\` INT NOT NULL,
        \`actual_quantity\` INT NULL,
        \`estimated_subtotal\` BIGINT NOT NULL,
        \`actual_subtotal\` BIGINT NULL,
        \`weighed_at\` BIGINT NULL,
        \`weighed_by\` BIGINT NULL,
        PRIMARY KEY (\`grocery_order_item_id\`),
        KEY \`idx_grocery_order_item_order\` (\`grocery_order_id\`),
        KEY \`idx_grocery_order_item_product\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生鲜订单行项'
    `);

    await qr.query(`
      CREATE TABLE \`pickup_verify_log\` (
        \`verify_log_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`grocery_order_id\` BIGINT NULL,
        \`order_no\` VARCHAR(32) NOT NULL,
        \`pickup_point_id\` BIGINT NOT NULL,
        \`operator_id\` BIGINT NOT NULL,
        \`operator_name\` VARCHAR(32) NULL,
        \`verify_method\` TINYINT NOT NULL,
        \`result\` TINYINT NOT NULL,
        \`fail_reason\` VARCHAR(255) NULL,
        \`client_ip\` VARCHAR(45) NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`verify_log_id\`),
        KEY \`idx_pickup_verify_log_order\` (\`grocery_order_id\`),
        KEY \`idx_pickup_verify_log_operator_time\` (\`operator_id\`,\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='核销流水'
    `);

    await qr.query(`
      CREATE TABLE \`trace_batch\` (
        \`trace_batch_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`batch_no\` VARCHAR(32) NOT NULL,
        \`product_id\` BIGINT NOT NULL,
        \`total_count\` INT NOT NULL,
        \`produced_at\` BIGINT NOT NULL,
        \`shelf_life_days\` INT NULL,
        \`supplier_name\` VARCHAR(128) NULL,
        \`status\` TINYINT NOT NULL DEFAULT 1,
        \`created_by\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`trace_batch_id\`),
        UNIQUE KEY \`uk_trace_batch_no\` (\`batch_no\`),
        KEY \`idx_trace_batch_product\` (\`product_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='溯源批次'
    `);

    await qr.query(`
      CREATE TABLE \`trace_qr\` (
        \`trace_qr_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`qr_code\` VARCHAR(64) NOT NULL,
        \`signature\` CHAR(64) NOT NULL,
        \`trace_batch_id\` BIGINT NOT NULL,
        \`product_id\` BIGINT NOT NULL,
        \`serial_no\` INT NOT NULL,
        \`qr_image_file_id\` VARCHAR(64) NULL,
        \`status\` TINYINT NOT NULL DEFAULT 1,
        \`first_scan_at\` BIGINT NULL,
        \`scan_count\` INT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`trace_qr_id\`),
        UNIQUE KEY \`uk_trace_qr_code\` (\`qr_code\`),
        KEY \`idx_trace_qr_batch_serial\` (\`trace_batch_id\`,\`serial_no\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='溯源二维码'
    `);

    await qr.query(`
      CREATE TABLE \`trace_record\` (
        \`trace_record_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`trace_qr_id\` BIGINT NULL,
        \`trace_batch_id\` BIGINT NOT NULL,
        \`node_type\` TINYINT NOT NULL,
        \`node_title\` VARCHAR(64) NOT NULL,
        \`content\` TEXT NULL,
        \`attachments\` JSON NULL,
        \`happened_at\` BIGINT NOT NULL,
        \`operator_id\` BIGINT NULL,
        \`operator_name\` VARCHAR(32) NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`trace_record_id\`),
        KEY \`idx_trace_record_qr_time\` (\`trace_qr_id\`,\`happened_at\`),
        KEY \`idx_trace_record_batch_time\` (\`trace_batch_id\`,\`happened_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='溯源节点'
    `);

    await qr.query(`
      CREATE TABLE \`trace_scan_log\` (
        \`trace_scan_log_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`trace_qr_id\` BIGINT NOT NULL,
        \`qr_code\` VARCHAR(64) NOT NULL,
        \`customer_id\` BIGINT NULL,
        \`client_ip\` VARCHAR(45) NULL,
        \`ua\` VARCHAR(255) NULL,
        \`scanned_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`trace_scan_log_id\`),
        KEY \`idx_trace_scan_log_qr_time\` (\`trace_qr_id\`,\`scanned_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='扫码日志'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `trace_scan_log`');
    await qr.query('DROP TABLE IF EXISTS `trace_record`');
    await qr.query('DROP TABLE IF EXISTS `trace_qr`');
    await qr.query('DROP TABLE IF EXISTS `trace_batch`');
    await qr.query('DROP TABLE IF EXISTS `pickup_verify_log`');
    await qr.query('DROP TABLE IF EXISTS `grocery_order_item`');
    await qr.query('DROP TABLE IF EXISTS `grocery_order`');
    await qr.query('DROP TABLE IF EXISTS `pickup_time_slot`');
    await qr.query('DROP TABLE IF EXISTS `pickup_point`');
  }
}
