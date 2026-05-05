import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 5 — 用户端外卖交易闭环,初始化 9 张业务表。
 * 来源:DESIGN_阶段5.md § 2 数据表设计。
 *
 * 表清单:
 *   1. food_order              — 外卖订单
 *   2. food_order_item         — 外卖订单项
 *   3. cart_item               — 购物车
 *   4. order_price_snapshot    — 试算价格快照(5min TTL)
 *   5. payment_order           — 支付单
 *   6. coupon_lock             — 优惠券锁定(stage 5 仅占位)
 *   7. stock_lock              — 库存锁定
 *   8. order_timeline          — 订单状态时间线
 *   9. order_review            — 订单评价(主评)
 *
 * 时间戳全 BIGINT 毫秒;金额 BIGINT 分;主键 `<table>_id`。
 */
export class Stage5Init1714867700000 implements MigrationInterface {
  name = 'Stage5Init1714867700000';

  async up(qr: QueryRunner): Promise<void> {
    // food_order
    await qr.query(`
      CREATE TABLE \`food_order\` (
        \`food_order_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_no\` VARCHAR(32) NOT NULL,
        \`customer_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`city_code\` VARCHAR(16) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'WAIT_PAY',
        \`pay_status\` VARCHAR(16) NOT NULL DEFAULT 'unpaid',
        \`delivery_type\` VARCHAR(16) NOT NULL DEFAULT 'instant',
        \`reserved_time\` BIGINT NULL,
        \`goods_amount\` BIGINT NOT NULL,
        \`delivery_fee\` BIGINT NOT NULL DEFAULT 0,
        \`discount_amount\` BIGINT NOT NULL DEFAULT 0,
        \`payable_amount\` BIGINT NOT NULL,
        \`paid_amount\` BIGINT NULL,
        \`address_snapshot\` JSON NOT NULL,
        \`remark\` VARCHAR(512) NULL,
        \`expire_at\` BIGINT NOT NULL,
        \`paid_at\` BIGINT NULL,
        \`cancelled_at\` BIGINT NULL,
        \`cancelled_by\` VARCHAR(16) NULL,
        \`cancelled_reason\` VARCHAR(255) NULL,
        \`completed_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`food_order_id\`),
        UNIQUE KEY \`uk_food_order_no\` (\`order_no\`),
        KEY \`idx_food_order_customer_status\` (\`customer_id\`, \`status\`, \`created_at\`),
        KEY \`idx_food_order_store_status\` (\`store_id\`, \`status\`, \`created_at\`),
        KEY \`idx_food_order_status_created\` (\`status\`, \`created_at\`),
        KEY \`idx_food_order_city_status\` (\`city_code\`, \`status\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外卖订单'
    `);

    // food_order_item
    await qr.query(`
      CREATE TABLE \`food_order_item\` (
        \`food_order_item_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`food_order_id\` BIGINT NOT NULL,
        \`sku_id\` BIGINT NOT NULL,
        \`product_id\` BIGINT NOT NULL,
        \`sku_snapshot\` JSON NOT NULL,
        \`quantity\` INT NOT NULL,
        \`unit_price\` BIGINT NOT NULL,
        \`sub_total\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`food_order_item_id\`),
        KEY \`idx_food_order_item_order\` (\`food_order_id\`),
        KEY \`idx_food_order_item_sku\` (\`sku_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='外卖订单项'
    `);

    // cart_item
    await qr.query(`
      CREATE TABLE \`cart_item\` (
        \`cart_item_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`customer_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`sku_id\` BIGINT NOT NULL,
        \`quantity\` INT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`cart_item_id\`),
        UNIQUE KEY \`uk_cart_unique\` (\`customer_id\`, \`store_id\`, \`sku_id\`),
        KEY \`idx_cart_customer_store\` (\`customer_id\`, \`store_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='购物车'
    `);

    // order_price_snapshot
    await qr.query(`
      CREATE TABLE \`order_price_snapshot\` (
        \`order_price_snapshot_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`preview_id\` VARCHAR(64) NOT NULL,
        \`customer_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`payload\` JSON NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`expires_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`order_price_snapshot_id\`),
        UNIQUE KEY \`uk_order_price_snapshot_preview\` (\`preview_id\`),
        KEY \`idx_order_price_snapshot_expires\` (\`expires_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单价格快照'
    `);

    // payment_order
    await qr.query(`
      CREATE TABLE \`payment_order\` (
        \`payment_order_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`pay_order_no\` VARCHAR(32) NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`biz_id\` BIGINT NOT NULL,
        \`pay_channel\` VARCHAR(16) NOT NULL,
        \`payable_amount\` BIGINT NOT NULL,
        \`paid_amount\` BIGINT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'pending',
        \`channel_trade_no\` VARCHAR(64) NULL,
        \`callback_raw\` JSON NULL,
        \`retry_count\` INT NOT NULL DEFAULT 0,
        \`expire_at\` BIGINT NOT NULL,
        \`paid_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`payment_order_id\`),
        UNIQUE KEY \`uk_payment_order_no\` (\`pay_order_no\`),
        KEY \`idx_payment_order_biz\` (\`biz_type\`, \`biz_id\`),
        KEY \`idx_payment_order_status_expire\` (\`status\`, \`expire_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付单'
    `);

    // coupon_lock
    await qr.query(`
      CREATE TABLE \`coupon_lock\` (
        \`coupon_lock_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_id\` BIGINT NOT NULL,
        \`coupon_id\` BIGINT NOT NULL,
        \`customer_id\` BIGINT NOT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'active',
        \`created_at\` BIGINT NOT NULL,
        \`released_at\` BIGINT NULL,
        PRIMARY KEY (\`coupon_lock_id\`),
        KEY \`idx_coupon_lock_coupon\` (\`coupon_id\`),
        KEY \`idx_coupon_lock_customer_status\` (\`customer_id\`, \`status\`),
        KEY \`idx_coupon_lock_order\` (\`order_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优惠券锁定(stage 5 仅占位)'
    `);

    // stock_lock
    await qr.query(`
      CREATE TABLE \`stock_lock\` (
        \`stock_lock_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_id\` BIGINT NOT NULL,
        \`sku_id\` BIGINT NOT NULL,
        \`quantity\` INT NOT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'active',
        \`created_at\` BIGINT NOT NULL,
        \`released_at\` BIGINT NULL,
        PRIMARY KEY (\`stock_lock_id\`),
        KEY \`idx_stock_lock_sku\` (\`sku_id\`),
        KEY \`idx_stock_lock_order\` (\`order_id\`),
        KEY \`idx_stock_lock_status_created\` (\`status\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='库存锁定'
    `);

    // order_timeline
    await qr.query(`
      CREATE TABLE \`order_timeline\` (
        \`order_timeline_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_id\` BIGINT NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL DEFAULT 'FOOD',
        \`from_status\` VARCHAR(32) NULL,
        \`to_status\` VARCHAR(32) NOT NULL,
        \`actor_type\` VARCHAR(16) NOT NULL,
        \`actor_id\` VARCHAR(64) NULL,
        \`reason\` VARCHAR(255) NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`order_timeline_id\`),
        KEY \`idx_order_timeline_order_created\` (\`order_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单状态时间线'
    `);

    // order_review
    await qr.query(`
      CREATE TABLE \`order_review\` (
        \`order_review_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_id\` BIGINT NOT NULL,
        \`customer_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`rating\` TINYINT NOT NULL,
        \`content\` VARCHAR(500) NULL,
        \`image_file_ids\` JSON NULL,
        \`anonymous\` TINYINT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`order_review_id\`),
        UNIQUE KEY \`uk_order_review_main\` (\`order_id\`),
        KEY \`idx_order_review_store_rating\` (\`store_id\`, \`rating\`, \`created_at\`),
        KEY \`idx_order_review_customer\` (\`customer_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单评价(主评)'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `order_review`');
    await qr.query('DROP TABLE IF EXISTS `order_timeline`');
    await qr.query('DROP TABLE IF EXISTS `stock_lock`');
    await qr.query('DROP TABLE IF EXISTS `coupon_lock`');
    await qr.query('DROP TABLE IF EXISTS `payment_order`');
    await qr.query('DROP TABLE IF EXISTS `order_price_snapshot`');
    await qr.query('DROP TABLE IF EXISTS `cart_item`');
    await qr.query('DROP TABLE IF EXISTS `food_order_item`');
    await qr.query('DROP TABLE IF EXISTS `food_order`');
  }
}
