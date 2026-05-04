import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 0 — 初始化 11 张表(9 张系统表 + sys_role_permission 关联表 + domain_event 事件表)。
 * 来源:`项目阶段规划/00-阶段0-项目初始化与全局契约/后端数据任务事件.md` + DESIGN_阶段0.md § 4
 */
export class Stage0Init1714867200000 implements MigrationInterface {
  name = 'Stage0Init1714867200000';

  async up(qr: QueryRunner): Promise<void> {
    // sys_dict
    await qr.query(`
      CREATE TABLE \`sys_dict\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`dict_type\` VARCHAR(64) NOT NULL,
        \`code\` VARCHAR(64) NOT NULL,
        \`label\` VARCHAR(128) NOT NULL,
        \`sort\` INT NOT NULL DEFAULT 0,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        \`remark\` VARCHAR(255) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_dict_type_code\` (\`dict_type\`, \`code\`),
        KEY \`idx_dict_type\` (\`dict_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // sys_config
    await qr.query(`
      CREATE TABLE \`sys_config\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`config_key\` VARCHAR(128) NOT NULL,
        \`config_value\` TEXT NOT NULL,
        \`scope\` VARCHAR(32) NOT NULL DEFAULT 'global',
        \`description\` VARCHAR(255) NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_config_key\` (\`config_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // sys_error_code
    await qr.query(`
      CREATE TABLE \`sys_error_code\` (
        \`code\` VARCHAR(64) NOT NULL,
        \`i18n_zh\` VARCHAR(255) NOT NULL,
        \`i18n_en\` VARCHAR(255) NULL,
        \`level\` VARCHAR(16) NOT NULL,
        \`description\` TEXT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // sys_role
    await qr.query(`
      CREATE TABLE \`sys_role\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(64) NOT NULL,
        \`name\` VARCHAR(128) NOT NULL,
        \`scope\` ENUM('admin','merchant','rider','customer') NOT NULL,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_role_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // sys_permission
    await qr.query(`
      CREATE TABLE \`sys_permission\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(128) NOT NULL,
        \`name\` VARCHAR(128) NOT NULL,
        \`scope\` ENUM('admin','merchant','rider','customer','public') NOT NULL,
        \`type\` ENUM('menu','button','data') NOT NULL,
        \`parent_code\` VARCHAR(128) NULL,
        \`sort\` INT NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_perm_code\` (\`code\`),
        KEY \`idx_perm_scope\` (\`scope\`),
        KEY \`idx_perm_parent\` (\`parent_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // sys_role_permission
    await qr.query(`
      CREATE TABLE \`sys_role_permission\` (
        \`role_id\` BIGINT NOT NULL,
        \`permission_id\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`role_id\`, \`permission_id\`),
        KEY \`idx_rp_permission\` (\`permission_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // sys_audit_log
    await qr.query(`
      CREATE TABLE \`sys_audit_log\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`trace_id\` VARCHAR(128) NOT NULL,
        \`operator_type\` VARCHAR(32) NOT NULL,
        \`operator_id\` VARCHAR(64) NULL,
        \`target_type\` VARCHAR(64) NOT NULL,
        \`target_id\` VARCHAR(64) NULL,
        \`before_status\` VARCHAR(64) NULL,
        \`after_status\` VARCHAR(64) NULL,
        \`ip\` VARCHAR(64) NULL,
        \`device_id\` VARCHAR(128) NULL,
        \`summary\` VARCHAR(512) NULL,
        \`detail_ref\` VARCHAR(64) NULL COMMENT 'Mongo audit_log_detail._id',
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        KEY \`idx_audit_trace\` (\`trace_id\`),
        KEY \`idx_audit_target\` (\`target_type\`, \`target_id\`),
        KEY \`idx_audit_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // file_object
    await qr.query(`
      CREATE TABLE \`file_object\` (
        \`file_id\` VARCHAR(64) NOT NULL,
        \`biz_type\` VARCHAR(64) NOT NULL,
        \`owner_type\` ENUM('customer','merchant','rider','admin') NOT NULL,
        \`owner_id\` BIGINT NOT NULL,
        \`storage_provider\` VARCHAR(32) NOT NULL DEFAULT 'minio',
        \`bucket\` VARCHAR(128) NOT NULL,
        \`object_key\` VARCHAR(512) NOT NULL,
        \`url\` VARCHAR(1024) NULL,
        \`content_type\` VARCHAR(128) NULL,
        \`size\` BIGINT NULL,
        \`expire_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`file_id\`),
        KEY \`idx_file_owner\` (\`owner_type\`, \`owner_id\`),
        KEY \`idx_file_biz\` (\`biz_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // third_party_config
    await qr.query(`
      CREATE TABLE \`third_party_config\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`provider\` VARCHAR(64) NOT NULL,
        \`env\` VARCHAR(16) NOT NULL,
        \`encrypted_secret\` TEXT NULL,
        \`status\` ENUM('active','disabled','error') NOT NULL DEFAULT 'disabled',
        \`last_health_at\` BIGINT NULL,
        \`error_message\` VARCHAR(1024) NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_provider_env\` (\`provider\`, \`env\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // idempotency_record
    await qr.query(`
      CREATE TABLE \`idempotency_record\` (
        \`idempotency_key\` VARCHAR(128) NOT NULL,
        \`scope\` VARCHAR(64) NOT NULL,
        \`request_hash\` VARCHAR(128) NOT NULL,
        \`response_payload\` MEDIUMTEXT NULL,
        \`status\` ENUM('processing','done','failed') NOT NULL,
        \`expire_at\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`idempotency_key\`, \`scope\`),
        KEY \`idx_idem_expire\` (\`expire_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // domain_event
    await qr.query(`
      CREATE TABLE \`domain_event\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`event_id\` VARCHAR(64) NOT NULL,
        \`biz_type\` VARCHAR(64) NOT NULL,
        \`biz_id\` VARCHAR(128) NULL,
        \`payload\` JSON NULL,
        \`status\` ENUM('pending','processing','done','retrying','failed') NOT NULL DEFAULT 'pending',
        \`retry_count\` INT NOT NULL DEFAULT 0,
        \`error_message\` VARCHAR(1024) NULL,
        \`next_retry_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_event_id\` (\`event_id\`),
        KEY \`idx_event_status_retry\` (\`status\`, \`next_retry_at\`),
        KEY \`idx_event_biz\` (\`biz_type\`, \`biz_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS \`domain_event\``);
    await qr.query(`DROP TABLE IF EXISTS \`idempotency_record\``);
    await qr.query(`DROP TABLE IF EXISTS \`third_party_config\``);
    await qr.query(`DROP TABLE IF EXISTS \`file_object\``);
    await qr.query(`DROP TABLE IF EXISTS \`sys_audit_log\``);
    await qr.query(`DROP TABLE IF EXISTS \`sys_role_permission\``);
    await qr.query(`DROP TABLE IF EXISTS \`sys_permission\``);
    await qr.query(`DROP TABLE IF EXISTS \`sys_role\``);
    await qr.query(`DROP TABLE IF EXISTS \`sys_error_code\``);
    await qr.query(`DROP TABLE IF EXISTS \`sys_config\``);
    await qr.query(`DROP TABLE IF EXISTS \`sys_dict\``);
  }
}
