import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 6 — 用户端跑腿交易闭环,初始化 10 张表(8 业务 + 2 配置)。
 * 来源:DESIGN_阶段6.md § 3 数据表设计 + 规划文档 § 核心数据表/数据域。
 *
 * 业务表清单(8):
 *   1. errand_order            — 跑腿主订单
 *   2. errand_order_detail     — 订单详情(取送地址/物品/任务描述)
 *   3. errand_quote            — 报价快照(5 min TTL)
 *   4. errand_attachment       — 图片附件
 *   5. errand_price_snapshot   — 价格快照(submit 时冻结)
 *   6. errand_task             — 调度任务
 *   7. prohibited_item         — 违禁品库
 *   8. errand_timeline         — 订单事件流
 * 配置表清单(2):
 *   9. errand_pricing          — 计价规则(seed 1 条 GLOBAL)
 *  10. errand_type             — 跑腿类型配置(seed 4 条 BUY/DELIVER/HELP/CUSTOM)
 *
 * 时间戳全 BIGINT 毫秒;金额 BIGINT 分;主键 `<table>_id` BIGINT auto-increment。
 */
export class Stage6Init1714867800000 implements MigrationInterface {
  name = 'Stage6Init1714867800000';

  async up(qr: QueryRunner): Promise<void> {
    // 1. errand_order
    await qr.query(`
      CREATE TABLE \`errand_order\` (
        \`errand_order_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_no\` VARCHAR(32) NOT NULL,
        \`customer_id\` BIGINT NOT NULL,
        \`type_code\` VARCHAR(16) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'WAIT_PAY',
        \`pay_status\` VARCHAR(16) NOT NULL DEFAULT 'unpaid',
        \`pay_order_id\` BIGINT NULL,
        \`base_fee\` BIGINT NOT NULL DEFAULT 0,
        \`distance_fee\` BIGINT NOT NULL DEFAULT 0,
        \`urgent_fee\` BIGINT NOT NULL DEFAULT 0,
        \`budget\` BIGINT NULL,
        \`payable_amount\` BIGINT NOT NULL,
        \`paid_amount\` BIGINT NULL,
        \`urgent_level\` VARCHAR(16) NOT NULL DEFAULT 'standard',
        \`reserved_time\` BIGINT NULL,
        \`expire_at\` BIGINT NOT NULL,
        \`paid_at\` BIGINT NULL,
        \`dispatching_at\` BIGINT NULL,
        \`cancelled_at\` BIGINT NULL,
        \`cancelled_by\` VARCHAR(16) NULL,
        \`cancel_reason\` VARCHAR(255) NULL,
        \`completed_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_order_id\`),
        UNIQUE KEY \`uk_errand_order_no\` (\`order_no\`),
        KEY \`idx_errand_order_customer_status\` (\`customer_id\`, \`status\`, \`created_at\`),
        KEY \`idx_errand_order_status_created\` (\`status\`, \`created_at\`),
        KEY \`idx_errand_order_pay_order\` (\`pay_order_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿订单'
    `);

    // 2. errand_order_detail
    await qr.query(`
      CREATE TABLE \`errand_order_detail\` (
        \`errand_order_detail_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`errand_order_id\` BIGINT NOT NULL,
        \`pickup_address\` JSON NULL,
        \`delivery_address\` JSON NOT NULL,
        \`item_desc\` TEXT NULL,
        \`task_desc\` TEXT NULL,
        \`weight\` DECIMAL(8,2) NULL,
        \`distance_meters\` INT NOT NULL DEFAULT 0,
        \`remark\` VARCHAR(512) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_order_detail_id\`),
        UNIQUE KEY \`uk_errand_order_detail_order\` (\`errand_order_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿订单详情'
    `);

    // 3. errand_quote
    await qr.query(`
      CREATE TABLE \`errand_quote\` (
        \`errand_quote_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`customer_id\` BIGINT NOT NULL,
        \`type_code\` VARCHAR(16) NOT NULL,
        \`pickup_address\` JSON NULL,
        \`delivery_address\` JSON NOT NULL,
        \`weight\` DECIMAL(8,2) NULL,
        \`urgent_level\` VARCHAR(16) NOT NULL DEFAULT 'standard',
        \`budget\` BIGINT NULL,
        \`distance_meters\` INT NOT NULL DEFAULT 0,
        \`base_fee\` BIGINT NOT NULL DEFAULT 0,
        \`distance_fee\` BIGINT NOT NULL DEFAULT 0,
        \`urgent_fee\` BIGINT NOT NULL DEFAULT 0,
        \`payable_amount\` BIGINT NOT NULL,
        \`item_desc\` TEXT NULL,
        \`task_desc\` TEXT NULL,
        \`reserved_time\` BIGINT NULL,
        \`prohibited_warnings\` JSON NOT NULL,
        \`used_order_id\` BIGINT NULL,
        \`expire_at\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_quote_id\`),
        KEY \`idx_errand_quote_customer\` (\`customer_id\`, \`created_at\`),
        KEY \`idx_errand_quote_expire\` (\`expire_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿报价快照'
    `);

    // 4. errand_attachment
    await qr.query(`
      CREATE TABLE \`errand_attachment\` (
        \`errand_attachment_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`errand_order_id\` BIGINT NOT NULL,
        \`file_id\` BIGINT NOT NULL,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_attachment_id\`),
        KEY \`idx_errand_attachment_order\` (\`errand_order_id\`, \`sort\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿订单附件'
    `);

    // 5. errand_price_snapshot
    await qr.query(`
      CREATE TABLE \`errand_price_snapshot\` (
        \`errand_price_snapshot_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`errand_order_id\` BIGINT NOT NULL,
        \`quote_id\` BIGINT NOT NULL,
        \`payload\` JSON NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_price_snapshot_id\`),
        UNIQUE KEY \`uk_errand_price_snapshot_order\` (\`errand_order_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿价格快照'
    `);

    // 6. errand_task
    await qr.query(`
      CREATE TABLE \`errand_task\` (
        \`errand_task_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`errand_order_id\` BIGINT NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'READY_FOR_DISPATCH',
        \`rider_id\` BIGINT NULL,
        \`dispatch_count\` INT NOT NULL DEFAULT 0,
        \`price_increase\` BIGINT NOT NULL DEFAULT 0,
        \`pickup_address\` JSON NULL,
        \`delivery_address\` JSON NOT NULL,
        \`distance_meters\` INT NOT NULL DEFAULT 0,
        \`last_dispatched_at\` BIGINT NULL,
        \`assigned_at\` BIGINT NULL,
        \`picked_up_at\` BIGINT NULL,
        \`delivered_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_task_id\`),
        UNIQUE KEY \`uk_errand_task_order\` (\`errand_order_id\`),
        KEY \`idx_errand_task_status_created\` (\`status\`, \`created_at\`),
        KEY \`idx_errand_task_rider\` (\`rider_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿调度任务'
    `);

    // 7. prohibited_item
    await qr.query(`
      CREATE TABLE \`prohibited_item\` (
        \`prohibited_item_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`keyword\` VARCHAR(64) NOT NULL,
        \`category\` VARCHAR(32) NOT NULL,
        \`level\` VARCHAR(16) NOT NULL DEFAULT 'WARN',
        \`description\` VARCHAR(255) NOT NULL,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`prohibited_item_id\`),
        UNIQUE KEY \`uk_prohibited_item_keyword\` (\`keyword\`),
        KEY \`idx_prohibited_item_enabled\` (\`enabled\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='违禁品库'
    `);

    // 8. errand_timeline
    await qr.query(`
      CREATE TABLE \`errand_timeline\` (
        \`errand_timeline_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`errand_order_id\` BIGINT NOT NULL,
        \`event_type\` VARCHAR(32) NOT NULL,
        \`payload\` JSON NULL,
        \`operator\` VARCHAR(16) NOT NULL DEFAULT 'system',
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_timeline_id\`),
        KEY \`idx_errand_timeline_order\` (\`errand_order_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿订单时间线'
    `);

    // 9. errand_pricing
    await qr.query(`
      CREATE TABLE \`errand_pricing\` (
        \`errand_pricing_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`city_code\` VARCHAR(16) NOT NULL DEFAULT 'GLOBAL',
        \`base_fee\` BIGINT NOT NULL DEFAULT 0,
        \`distance_fee_per_km\` BIGINT NOT NULL DEFAULT 0,
        \`urgent_standard_fee\` BIGINT NOT NULL DEFAULT 0,
        \`urgent_fast_fee\` BIGINT NOT NULL DEFAULT 0,
        \`urgent_express_fee\` BIGINT NOT NULL DEFAULT 0,
        \`weight_extra_per_kg\` BIGINT NOT NULL DEFAULT 0,
        \`min_distance_meters\` INT NOT NULL DEFAULT 0,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_pricing_id\`),
        UNIQUE KEY \`uk_errand_pricing_city\` (\`city_code\`),
        KEY \`idx_errand_pricing_enabled\` (\`enabled\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿计价规则'
    `);

    // 10. errand_type
    await qr.query(`
      CREATE TABLE \`errand_type\` (
        \`errand_type_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`type_code\` VARCHAR(16) NOT NULL,
        \`name\` VARCHAR(32) NOT NULL,
        \`required_fields\` JSON NOT NULL,
        \`description\` VARCHAR(255) NULL,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`errand_type_id\`),
        UNIQUE KEY \`uk_errand_type_code\` (\`type_code\`),
        KEY \`idx_errand_type_enabled\` (\`enabled\`, \`sort\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='跑腿类型配置'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `errand_type`');
    await qr.query('DROP TABLE IF EXISTS `errand_pricing`');
    await qr.query('DROP TABLE IF EXISTS `errand_timeline`');
    await qr.query('DROP TABLE IF EXISTS `prohibited_item`');
    await qr.query('DROP TABLE IF EXISTS `errand_task`');
    await qr.query('DROP TABLE IF EXISTS `errand_price_snapshot`');
    await qr.query('DROP TABLE IF EXISTS `errand_attachment`');
    await qr.query('DROP TABLE IF EXISTS `errand_quote`');
    await qr.query('DROP TABLE IF EXISTS `errand_order_detail`');
    await qr.query('DROP TABLE IF EXISTS `errand_order`');
  }
}
