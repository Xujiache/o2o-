import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 7 — 商家端 APP 订单售后结算数据,7 张新表 + food_order 扩 4 字段。
 * 来源:DESIGN_阶段7.md § 3 数据表设计 + 规划文档 § 后端数据任务事件。
 *
 * 业务表清单(7):
 *   1. after_sale                       — 售后单(主表)
 *   2. after_sale_evidence              — 售后凭证(子表)
 *   3. merchant_order_action_log        — 商家操作流水
 *   4. review_reply                     — 商家评价回复
 *   5. merchant_statistics_snapshot     — 经营快照(日级)
 *   6. merchant_settlement              — T+1 结算单
 *   7. merchant_withdrawal              — 商家提现单
 * 扩展 food_order:+ accepted_at / expected_ready_at / ready_at / reject_reason
 *
 * 时间戳全 BIGINT 毫秒;金额 BIGINT 分;主键 `<table>_id` BIGINT auto-increment。
 */
export class Stage7Init1715472600000 implements MigrationInterface {
  name = 'Stage7Init1715472600000';

  async up(qr: QueryRunner): Promise<void> {
    // 1. after_sale
    await qr.query(`
      CREATE TABLE \`after_sale\` (
        \`after_sale_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_id\` BIGINT NOT NULL,
        \`customer_id\` BIGINT NOT NULL,
        \`merchant_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`type\` VARCHAR(16) NOT NULL,
        \`reason\` VARCHAR(255) NOT NULL,
        \`amount_cents\` BIGINT NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'PENDING_MERCHANT',
        \`merchant_review_at\` BIGINT NULL,
        \`merchant_reject_reason\` VARCHAR(255) NULL,
        \`applied_at\` BIGINT NOT NULL,
        \`completed_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`after_sale_id\`),
        KEY \`idx_after_sale_order\` (\`order_id\`, \`created_at\`),
        KEY \`idx_after_sale_store_status\` (\`store_id\`, \`status\`, \`created_at\`),
        KEY \`idx_after_sale_customer_status\` (\`customer_id\`, \`status\`, \`created_at\`),
        KEY \`idx_after_sale_status_applied\` (\`status\`, \`applied_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后单'
    `);

    // 2. after_sale_evidence
    await qr.query(`
      CREATE TABLE \`after_sale_evidence\` (
        \`after_sale_evidence_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`after_sale_id\` BIGINT NOT NULL,
        \`file_id\` BIGINT NOT NULL,
        \`source\` VARCHAR(16) NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`after_sale_evidence_id\`),
        KEY \`idx_after_sale_evidence_main\` (\`after_sale_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后凭证'
    `);

    // 3. merchant_order_action_log
    await qr.query(`
      CREATE TABLE \`merchant_order_action_log\` (
        \`merchant_order_action_log_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_id\` BIGINT NOT NULL,
        \`merchant_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`action\` VARCHAR(16) NOT NULL,
        \`before_status\` VARCHAR(32) NULL,
        \`after_status\` VARCHAR(32) NULL,
        \`payload_json\` JSON NULL,
        \`operator_id\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`merchant_order_action_log_id\`),
        KEY \`idx_merchant_order_action_log_order\` (\`order_id\`, \`created_at\`),
        KEY \`idx_merchant_order_action_log_merchant\` (\`merchant_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商家订单操作流水'
    `);

    // 4. review_reply
    await qr.query(`
      CREATE TABLE \`review_reply\` (
        \`review_reply_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`order_review_id\` BIGINT NOT NULL,
        \`merchant_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`content\` VARCHAR(500) NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`review_reply_id\`),
        UNIQUE KEY \`uk_review_reply_review\` (\`order_review_id\`),
        KEY \`idx_review_reply_store\` (\`store_id\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商家评价回复'
    `);

    // 5. merchant_statistics_snapshot
    await qr.query(`
      CREATE TABLE \`merchant_statistics_snapshot\` (
        \`merchant_statistics_snapshot_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`store_id\` BIGINT NOT NULL,
        \`merchant_id\` BIGINT NOT NULL,
        \`snapshot_date\` INT NOT NULL,
        \`order_count\` INT NOT NULL DEFAULT 0,
        \`gross_cents\` BIGINT NOT NULL DEFAULT 0,
        \`refund_cents\` BIGINT NOT NULL DEFAULT 0,
        \`net_cents\` BIGINT NOT NULL DEFAULT 0,
        \`top_items_json\` JSON NULL,
        \`store_rating\` DECIMAL(3,2) NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`merchant_statistics_snapshot_id\`),
        UNIQUE KEY \`uk_merchant_stat_store_date\` (\`store_id\`, \`snapshot_date\`),
        KEY \`idx_merchant_stat_date\` (\`snapshot_date\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商家经营日快照'
    `);

    // 6. merchant_settlement
    await qr.query(`
      CREATE TABLE \`merchant_settlement\` (
        \`merchant_settlement_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`settlement_no\` VARCHAR(32) NOT NULL,
        \`merchant_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`period_start\` BIGINT NOT NULL,
        \`period_end\` BIGINT NOT NULL,
        \`gross_cents\` BIGINT NOT NULL DEFAULT 0,
        \`commission_cents\` BIGINT NOT NULL DEFAULT 0,
        \`fee_cents\` BIGINT NOT NULL DEFAULT 0,
        \`net_cents\` BIGINT NOT NULL DEFAULT 0,
        \`order_count\` INT NOT NULL DEFAULT 0,
        \`refund_count\` INT NOT NULL DEFAULT 0,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`completed_at\` BIGINT NULL,
        \`fail_reason\` VARCHAR(255) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`merchant_settlement_id\`),
        UNIQUE KEY \`uk_merchant_settlement_no\` (\`settlement_no\`),
        UNIQUE KEY \`uk_merchant_settlement_period\` (\`store_id\`, \`period_start\`, \`period_end\`),
        KEY \`idx_merchant_settlement_store_status\` (\`store_id\`, \`status\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商家结算单'
    `);

    // 7. merchant_withdrawal
    await qr.query(`
      CREATE TABLE \`merchant_withdrawal\` (
        \`merchant_withdrawal_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`withdrawal_no\` VARCHAR(32) NOT NULL,
        \`merchant_id\` BIGINT NOT NULL,
        \`store_id\` BIGINT NOT NULL,
        \`amount_cents\` BIGINT NOT NULL,
        \`account_id\` BIGINT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`sms_code_hash\` VARCHAR(128) NULL,
        \`submitted_at\` BIGINT NOT NULL,
        \`completed_at\` BIGINT NULL,
        \`fail_reason\` VARCHAR(255) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`merchant_withdrawal_id\`),
        UNIQUE KEY \`uk_merchant_withdrawal_no\` (\`withdrawal_no\`),
        KEY \`idx_merchant_withdrawal_store_status\` (\`store_id\`, \`status\`, \`submitted_at\`),
        KEY \`idx_merchant_withdrawal_merchant\` (\`merchant_id\`, \`submitted_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='商家提现单'
    `);

    // 8. ALTER food_order:补 4 字段(stage 5 已建表,此处补字段)
    await qr.query(`
      ALTER TABLE \`food_order\`
        ADD COLUMN \`accepted_at\` BIGINT NULL AFTER \`completed_at\`,
        ADD COLUMN \`expected_ready_at\` BIGINT NULL AFTER \`accepted_at\`,
        ADD COLUMN \`ready_at\` BIGINT NULL AFTER \`expected_ready_at\`,
        ADD COLUMN \`reject_reason\` VARCHAR(255) NULL AFTER \`ready_at\`
    `);

    // 9. food_order 索引补充(merchant 端列表 store_id+status+created_at 已存,无需新增)
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE \`food_order\` DROP COLUMN \`reject_reason\``);
    await qr.query(`ALTER TABLE \`food_order\` DROP COLUMN \`ready_at\``);
    await qr.query(`ALTER TABLE \`food_order\` DROP COLUMN \`expected_ready_at\``);
    await qr.query(`ALTER TABLE \`food_order\` DROP COLUMN \`accepted_at\``);
    await qr.query(`DROP TABLE IF EXISTS \`merchant_withdrawal\``);
    await qr.query(`DROP TABLE IF EXISTS \`merchant_settlement\``);
    await qr.query(`DROP TABLE IF EXISTS \`merchant_statistics_snapshot\``);
    await qr.query(`DROP TABLE IF EXISTS \`review_reply\``);
    await qr.query(`DROP TABLE IF EXISTS \`merchant_order_action_log\``);
    await qr.query(`DROP TABLE IF EXISTS \`after_sale_evidence\``);
    await qr.query(`DROP TABLE IF EXISTS \`after_sale\``);
  }
}
