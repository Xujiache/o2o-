import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 11 — 最小积分流水能力。
 *
 * `points_rule` 已在 Stage9 建表,本迁移只补用户积分明细,用于支撑用户积分概览和记录查询。
 */
export class Stage11Points1717892700000 implements MigrationInterface {
  name = 'Stage11Points1717892700000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE \`points_record\` (
        \`points_record_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`customer_id\` BIGINT NOT NULL,
        \`change_type\` VARCHAR(16) NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`biz_order_id\` BIGINT NULL,
        \`points\` INT NOT NULL,
        \`balance_after\` INT NULL,
        \`remark\` VARCHAR(255) NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`points_record_id\`),
        KEY \`idx_points_record_customer_created\` (\`customer_id\`, \`created_at\`),
        KEY \`idx_points_record_biz\` (\`biz_type\`, \`biz_order_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户积分流水'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `points_record`');
  }
}
