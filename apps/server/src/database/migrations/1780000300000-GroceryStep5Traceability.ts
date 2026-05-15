import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GR-5 — 一鸡一码溯源:档案 + 二维码 + 批次 3 张表
 */
export class GroceryStep5Traceability1780000300000 implements MigrationInterface {
  name = 'GroceryStep5Traceability1780000300000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`traceability_archive\` (
        \`archive_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`product_id\` BIGINT NULL,
        \`batch_no\` VARCHAR(64) NOT NULL,
        \`farm_name\` VARCHAR(128) NULL,
        \`farm_address\` VARCHAR(255) NULL,
        \`breed_date\` BIGINT NULL,
        \`slaughter_date\` BIGINT NULL,
        \`weight_grams\` INT NULL,
        \`quarantine_cert_no\` VARCHAR(64) NULL,
        \`veterinarian\` VARCHAR(64) NULL,
        \`feed_type\` VARCHAR(128) NULL,
        \`vaccine_records\` JSON NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
        \`remark\` TEXT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`archive_id\`),
        KEY \`idx_trace_archive_product\` (\`product_id\`),
        KEY \`idx_trace_archive_batch\` (\`batch_no\`),
        KEY \`idx_trace_archive_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-5 溯源档案(一鸡一档)';
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`qrcode_batch\` (
        \`batch_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(128) NOT NULL,
        \`total_count\` INT NOT NULL,
        \`generated_by\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`batch_id\`),
        KEY \`idx_qrcode_batch_created\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-5 二维码批次';
    `);

    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`traceability_qrcode\` (
        \`qrcode_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`code\` VARCHAR(32) NOT NULL,
        \`archive_id\` BIGINT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'blank',
        \`generated_batch_id\` BIGINT NOT NULL,
        \`generated_at\` BIGINT NOT NULL,
        \`bound_at\` BIGINT NULL,
        \`sold_at\` BIGINT NULL,
        \`sold_order_id\` BIGINT NULL,
        PRIMARY KEY (\`qrcode_id\`),
        UNIQUE KEY \`uk_trace_qrcode_code\` (\`code\`),
        KEY \`idx_trace_qrcode_archive\` (\`archive_id\`),
        KEY \`idx_trace_qrcode_batch\` (\`generated_batch_id\`),
        KEY \`idx_trace_qrcode_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-5 一鸡一码二维码';
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `traceability_qrcode`');
    await qr.query('DROP TABLE IF EXISTS `qrcode_batch`');
    await qr.query('DROP TABLE IF EXISTS `traceability_archive`');
  }
}
