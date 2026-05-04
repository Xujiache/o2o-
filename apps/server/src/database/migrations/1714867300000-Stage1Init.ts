import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 1 — 用户端账号地址与基础框架,初始化 8 张业务表。
 * 来源:DESIGN_阶段1.md § 3 数据表设计。
 *
 * 表清单:
 *   1. customer_user        — 用户主表
 *   2. customer_profile     — 用户资料(1:1)
 *   3. customer_address     — 收件地址(1:N)
 *   4. realname_record      — 实名认证流水
 *   5. sms_code             — 短信验证码记录
 *   6. login_device         — 登录设备 / refresh token 哈希
 *   7. message_setting      — 消息推送设置(1:1)
 *   8. risk_user_tag        — 风控标签
 *
 * 时间戳统一用 BIGINT 毫秒(沿用 Stage 0 约定),非 DESIGN 文档字面 DATETIME(3)。
 */
export class Stage1Init1714867300000 implements MigrationInterface {
  name = 'Stage1Init1714867300000';

  async up(qr: QueryRunner): Promise<void> {
    // customer_user
    await qr.query(`
      CREATE TABLE \`customer_user\` (
        \`user_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`mobile\` VARCHAR(20) NOT NULL,
        \`wechat_open_id\` VARCHAR(64) NULL,
        \`account_status\` ENUM('active','disabled') NOT NULL DEFAULT 'active',
        \`realname_status\` ENUM('unverified','pending','verified','failed') NOT NULL DEFAULT 'unverified',
        \`profile_completed\` TINYINT NOT NULL DEFAULT 0,
        \`register_source\` ENUM('mobile','wechat') NOT NULL,
        \`register_device_id\` VARCHAR(64) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`user_id\`),
        UNIQUE KEY \`uk_mobile\` (\`mobile\`),
        UNIQUE KEY \`uk_wechat_open_id\` (\`wechat_open_id\`),
        KEY \`idx_status\` (\`account_status\`, \`realname_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // customer_profile
    await qr.query(`
      CREATE TABLE \`customer_profile\` (
        \`user_id\` BIGINT NOT NULL,
        \`nickname\` VARCHAR(64) NOT NULL,
        \`avatar_url\` VARCHAR(500) NULL,
        \`gender\` ENUM('unknown','male','female') NOT NULL DEFAULT 'unknown',
        \`birthday\` DATE NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // customer_address
    await qr.query(`
      CREATE TABLE \`customer_address\` (
        \`address_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT NOT NULL,
        \`receiver_name\` VARCHAR(50) NOT NULL,
        \`mobile\` VARCHAR(20) NOT NULL,
        \`city_code\` VARCHAR(20) NOT NULL,
        \`detail\` VARCHAR(255) NOT NULL,
        \`lng\` DECIMAL(10,7) NOT NULL,
        \`lat\` DECIMAL(10,7) NOT NULL,
        \`is_default\` TINYINT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`address_id\`),
        KEY \`idx_user_default\` (\`user_id\`, \`is_default\`, \`updated_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // realname_record
    await qr.query(`
      CREATE TABLE \`realname_record\` (
        \`record_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT NOT NULL,
        \`real_name\` VARCHAR(50) NOT NULL,
        \`id_card_no\` VARCHAR(30) NOT NULL,
        \`status\` ENUM('pending','success','failed') NOT NULL DEFAULT 'pending',
        \`failed_reason\` VARCHAR(100) NULL,
        \`provider_request_id\` VARCHAR(64) NULL,
        \`verified_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`record_id\`),
        KEY \`idx_user_status\` (\`user_id\`, \`status\`),
        KEY \`idx_pending\` (\`status\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // sms_code
    await qr.query(`
      CREATE TABLE \`sms_code\` (
        \`code_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`mobile\` VARCHAR(20) NOT NULL,
        \`scene\` ENUM('login','realname','change-mobile','sensitive') NOT NULL,
        \`code\` CHAR(6) NOT NULL,
        \`expire_at\` BIGINT NOT NULL,
        \`used_at\` BIGINT NULL,
        \`client_ip\` VARCHAR(45) NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`code_id\`),
        KEY \`idx_mobile_scene\` (\`mobile\`, \`scene\`, \`created_at\`),
        KEY \`idx_cleanup\` (\`expire_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // login_device
    await qr.query(`
      CREATE TABLE \`login_device\` (
        \`login_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT NOT NULL,
        \`device_id\` VARCHAR(64) NOT NULL,
        \`platform\` ENUM('mp-weixin','app-android','app-ios','h5') NOT NULL,
        \`login_ip\` VARCHAR(45) NULL,
        \`login_city\` VARCHAR(50) NULL,
        \`refresh_token_hash\` CHAR(64) NOT NULL,
        \`login_at\` BIGINT NOT NULL,
        \`last_active_at\` BIGINT NOT NULL,
        \`status\` ENUM('active','revoked') NOT NULL DEFAULT 'active',
        PRIMARY KEY (\`login_id\`),
        KEY \`idx_user_status\` (\`user_id\`, \`status\`),
        KEY \`idx_refresh\` (\`refresh_token_hash\`),
        KEY \`idx_anomaly\` (\`user_id\`, \`login_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // message_setting
    await qr.query(`
      CREATE TABLE \`message_setting\` (
        \`user_id\` BIGINT NOT NULL,
        \`order_notify\` TINYINT NOT NULL DEFAULT 1,
        \`activity_notify\` TINYINT NOT NULL DEFAULT 1,
        \`sms_notify\` TINYINT NOT NULL DEFAULT 1,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // risk_user_tag
    await qr.query(`
      CREATE TABLE \`risk_user_tag\` (
        \`tag_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT NOT NULL,
        \`tag_type\` VARCHAR(40) NOT NULL,
        \`reason\` VARCHAR(255) NULL,
        \`created_by\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`tag_id\`),
        KEY \`idx_user_tag\` (\`user_id\`, \`tag_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS \`risk_user_tag\``);
    await qr.query(`DROP TABLE IF EXISTS \`message_setting\``);
    await qr.query(`DROP TABLE IF EXISTS \`login_device\``);
    await qr.query(`DROP TABLE IF EXISTS \`sms_code\``);
    await qr.query(`DROP TABLE IF EXISTS \`realname_record\``);
    await qr.query(`DROP TABLE IF EXISTS \`customer_address\``);
    await qr.query(`DROP TABLE IF EXISTS \`customer_profile\``);
    await qr.query(`DROP TABLE IF EXISTS \`customer_user\``);
  }
}
