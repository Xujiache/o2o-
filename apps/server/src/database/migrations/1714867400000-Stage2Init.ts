import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 2 — 商家端 APP 入驻店铺与商品管理,初始化 11 张业务表。
 * 来源:DESIGN_阶段2.md § 3 数据表设计。
 *
 * 表清单:
 *   1. merchant_account       — 商家主账号
 *   2. merchant_application   — 入驻申请(可重复提交)
 *   3. merchant_license       — 资质文件关联
 *   4. store                  — 店铺(merchant:store=1:1 强约束)
 *   5. store_business_hour    — 营业时间(7 天 N 段)
 *   6. store_delivery_area    — 配送范围(GeoJSON Polygon)
 *   7. product_category       — 商品分类
 *   8. product                — 商品主表
 *   9. product_sku            — 商品 SKU
 *  10. stock_record           — 库存流水
 *  11. merchant_promotion     — 限时折扣 / 单品满减
 *
 * 时间戳沿用 stage 0/1 BIGINT 毫秒约定;金额 BIGINT 分;commission_rate DECIMAL(5,4)。
 */
export class Stage2Init1714867400000 implements MigrationInterface {
  name = 'Stage2Init1714867400000';

  async up(qr: QueryRunner): Promise<void> {
    // merchant_account
    await qr.query(`
      CREATE TABLE \`merchant_account\` (
        \`merchant_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`mobile\` VARCHAR(20) NOT NULL,
        \`account_status\` ENUM('pending','active','disabled') NOT NULL DEFAULT 'pending',
        \`latest_application_id\` BIGINT NULL,
        \`approved_store_id\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`merchant_id\`),
        UNIQUE KEY \`uk_merchant_mobile\` (\`mobile\`),
        KEY \`idx_merchant_status\` (\`account_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // merchant_application
    await qr.query(`
      CREATE TABLE \`merchant_application\` (
        \`application_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`merchant_id\` BIGINT NOT NULL,
        \`audit_status\` ENUM('pending','approved','rejected','disabled') NOT NULL DEFAULT 'pending',
        \`store_name\` VARCHAR(128) NOT NULL,
        \`business_scope\` VARCHAR(255) NOT NULL,
        \`legal_person\` VARCHAR(50) NOT NULL,
        \`id_card_no\` VARCHAR(30) NOT NULL,
        \`license_no\` VARCHAR(40) NOT NULL,
        \`food_permit_no\` VARCHAR(40) NULL,
        \`commission_rate\` DECIMAL(5,4) NULL,
        \`reject_reason\` VARCHAR(500) NULL,
        \`submitted_at\` BIGINT NOT NULL,
        \`audited_at\` BIGINT NULL,
        \`audited_by\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`application_id\`),
        KEY \`idx_merchant_status\` (\`merchant_id\`, \`audit_status\`, \`submitted_at\`),
        KEY \`idx_pending\` (\`audit_status\`, \`submitted_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // merchant_license
    await qr.query(`
      CREATE TABLE \`merchant_license\` (
        \`license_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`application_id\` BIGINT NOT NULL,
        \`license_type\` ENUM('business_license','food_permit','legal_id_card_front','legal_id_card_back','store_photo') NOT NULL,
        \`file_id\` VARCHAR(64) NOT NULL,
        \`expiry_date\` DATE NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`license_id\`),
        KEY \`idx_application_type\` (\`application_id\`, \`license_type\`),
        KEY \`idx_expiry\` (\`expiry_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // store
    await qr.query(`
      CREATE TABLE \`store\` (
        \`store_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`merchant_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(128) NOT NULL,
        \`avatar_file_id\` VARCHAR(64) NULL,
        \`intro\` VARCHAR(500) NULL,
        \`business_scope\` VARCHAR(255) NOT NULL,
        \`business_status\` ENUM('online','offline','paused') NOT NULL DEFAULT 'offline',
        \`min_order_amount\` BIGINT NOT NULL DEFAULT 0,
        \`delivery_fee\` BIGINT NOT NULL DEFAULT 0,
        \`commission_rate\` DECIMAL(5,4) NULL,
        \`notice\` VARCHAR(500) NULL,
        \`city_code\` VARCHAR(20) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`store_id\`),
        UNIQUE KEY \`uk_store_merchant\` (\`merchant_id\`),
        KEY \`idx_store_status\` (\`business_status\`, \`city_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // store_business_hour
    await qr.query(`
      CREATE TABLE \`store_business_hour\` (
        \`record_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`store_id\` BIGINT NOT NULL,
        \`day_of_week\` TINYINT NOT NULL,
        \`start_time\` TIME NOT NULL,
        \`end_time\` TIME NOT NULL,
        PRIMARY KEY (\`record_id\`),
        KEY \`idx_store\` (\`store_id\`, \`day_of_week\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // store_delivery_area
    await qr.query(`
      CREATE TABLE \`store_delivery_area\` (
        \`area_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`store_id\` BIGINT NOT NULL,
        \`geometry\` JSON NOT NULL,
        \`min_order_amount\` BIGINT NOT NULL DEFAULT 0,
        \`delivery_fee\` BIGINT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`area_id\`),
        KEY \`idx_store\` (\`store_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // product_category
    await qr.query(`
      CREATE TABLE \`product_category\` (
        \`category_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`store_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(64) NOT NULL,
        \`display_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`category_id\`),
        KEY \`idx_store_order\` (\`store_id\`, \`display_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // product
    await qr.query(`
      CREATE TABLE \`product\` (
        \`product_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`store_id\` BIGINT NOT NULL,
        \`category_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(128) NOT NULL,
        \`description\` TEXT NULL,
        \`cover_image_file_id\` VARCHAR(64) NULL,
        \`images\` JSON NULL,
        \`price\` BIGINT NOT NULL,
        \`original_price\` BIGINT NULL,
        \`stock\` INT NOT NULL DEFAULT 0,
        \`stock_alert_threshold\` INT NULL DEFAULT 5,
        \`has_sku\` TINYINT NOT NULL DEFAULT 0,
        \`sale_status\` ENUM('draft','on_shelf','off_shelf','sold_out') NOT NULL DEFAULT 'draft',
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`product_id\`),
        KEY \`idx_store_status\` (\`store_id\`, \`sale_status\`),
        KEY \`idx_product_category\` (\`category_id\`),
        KEY \`idx_alert\` (\`stock\`, \`stock_alert_threshold\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // product_sku
    await qr.query(`
      CREATE TABLE \`product_sku\` (
        \`sku_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`product_id\` BIGINT NOT NULL,
        \`spec_value\` VARCHAR(255) NOT NULL,
        \`price\` BIGINT NOT NULL,
        \`stock\` INT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`sku_id\`),
        KEY \`idx_product\` (\`product_id\`),
        UNIQUE KEY \`uk_product_spec\` (\`product_id\`, \`spec_value\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // stock_record
    await qr.query(`
      CREATE TABLE \`stock_record\` (
        \`record_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`product_id\` BIGINT NOT NULL,
        \`sku_id\` BIGINT NULL,
        \`quantity_change\` INT NOT NULL,
        \`reason\` VARCHAR(64) NOT NULL,
        \`operator_id\` VARCHAR(64) NOT NULL,
        \`operator_type\` VARCHAR(20) NOT NULL,
        \`stock_before\` INT NOT NULL,
        \`stock_after\` INT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`record_id\`),
        KEY \`idx_product_time\` (\`product_id\`, \`created_at\`),
        KEY \`idx_sku\` (\`sku_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // merchant_promotion
    await qr.query(`
      CREATE TABLE \`merchant_promotion\` (
        \`promo_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`store_id\` BIGINT NOT NULL,
        \`promo_type\` ENUM('time_limited','single_full_off') NOT NULL,
        \`name\` VARCHAR(128) NOT NULL,
        \`product_ids\` JSON NOT NULL,
        \`rules\` JSON NOT NULL,
        \`start_time\` BIGINT NOT NULL,
        \`end_time\` BIGINT NOT NULL,
        \`status\` ENUM('draft','scheduled','active','paused','ended') NOT NULL DEFAULT 'draft',
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`promo_id\`),
        KEY \`idx_store_promo_status\` (\`store_id\`, \`status\`),
        KEY \`idx_active_window\` (\`status\`, \`start_time\`, \`end_time\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS \`merchant_promotion\``);
    await qr.query(`DROP TABLE IF EXISTS \`stock_record\``);
    await qr.query(`DROP TABLE IF EXISTS \`product_sku\``);
    await qr.query(`DROP TABLE IF EXISTS \`product\``);
    await qr.query(`DROP TABLE IF EXISTS \`product_category\``);
    await qr.query(`DROP TABLE IF EXISTS \`store_delivery_area\``);
    await qr.query(`DROP TABLE IF EXISTS \`store_business_hour\``);
    await qr.query(`DROP TABLE IF EXISTS \`store\``);
    await qr.query(`DROP TABLE IF EXISTS \`merchant_license\``);
    await qr.query(`DROP TABLE IF EXISTS \`merchant_application\``);
    await qr.query(`DROP TABLE IF EXISTS \`merchant_account\``);
  }
}
