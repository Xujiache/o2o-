import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 4 — 平台管理端 Web 审核管控与基础配置,初始化 4 张业务表。
 * 来源:DESIGN_阶段4.md § 2 数据表设计。
 *
 * 表清单:
 *   1. admin_user               — 管理员账号(stage 4 新建,含 password_hash + lock 字段)
 *   2. city_site                — 平台城市站点权威表(GeoJSON Polygon)
 *   3. platform_category        — 平台类目(takeaway / errand 单表 + bizType 区分)
 *   4. account_disable_record   — 账号禁用启用流水
 *
 * 时间戳沿用 stage 0/1/2/3 BIGINT 毫秒约定。
 */
export class Stage4Init1714867600000 implements MigrationInterface {
  name = 'Stage4Init1714867600000';

  async up(qr: QueryRunner): Promise<void> {
    // admin_user
    await qr.query(`
      CREATE TABLE \`admin_user\` (
        \`admin_user_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`username\` VARCHAR(64) NOT NULL,
        \`password_hash\` VARCHAR(128) NOT NULL DEFAULT '',
        \`display_name\` VARCHAR(128) NULL,
        \`status\` ENUM('active','disabled') NOT NULL DEFAULT 'active',
        \`role_codes\` JSON NOT NULL,
        \`login_failed_count\` INT NOT NULL DEFAULT 0,
        \`locked_until\` BIGINT NOT NULL DEFAULT 0,
        \`last_login_at\` BIGINT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`admin_user_id\`),
        UNIQUE KEY \`uk_admin_user_username\` (\`username\`),
        KEY \`idx_admin_user_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // city_site
    await qr.query(`
      CREATE TABLE \`city_site\` (
        \`city_site_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`city_code\` VARCHAR(16) NOT NULL,
        \`city_name\` VARCHAR(64) NOT NULL,
        \`province\` VARCHAR(64) NULL,
        \`service_enabled\` TINYINT NOT NULL DEFAULT 1,
        \`service_area\` JSON NULL,
        \`display_order\` INT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`city_site_id\`),
        UNIQUE KEY \`uk_city_site_code\` (\`city_code\`),
        KEY \`idx_city_site_enabled_order\` (\`service_enabled\`, \`display_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // platform_category
    await qr.query(`
      CREATE TABLE \`platform_category\` (
        \`category_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`parent_id\` BIGINT NOT NULL DEFAULT 0,
        \`name\` VARCHAR(64) NOT NULL,
        \`icon_url\` VARCHAR(512) NULL,
        \`display_order\` INT NOT NULL DEFAULT 0,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`category_id\`),
        UNIQUE KEY \`uk_platform_category\` (\`biz_type\`, \`parent_id\`, \`name\`),
        KEY \`idx_platform_category_listing\` (\`biz_type\`, \`enabled\`, \`display_order\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // account_disable_record
    await qr.query(`
      CREATE TABLE \`account_disable_record\` (
        \`account_disable_record_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`account_type\` VARCHAR(16) NOT NULL,
        \`account_id\` BIGINT NOT NULL,
        \`action\` VARCHAR(16) NOT NULL,
        \`reason\` VARCHAR(512) NULL,
        \`operator_admin_id\` BIGINT NOT NULL,
        \`operator_username\` VARCHAR(64) NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`account_disable_record_id\`),
        KEY \`idx_disable_target\` (\`account_type\`, \`account_id\`, \`created_at\`),
        KEY \`idx_disable_operator\` (\`operator_admin_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS \`account_disable_record\``);
    await qr.query(`DROP TABLE IF EXISTS \`platform_category\``);
    await qr.query(`DROP TABLE IF EXISTS \`city_site\``);
    await qr.query(`DROP TABLE IF EXISTS \`admin_user\``);
  }
}
