import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 10 — 四端联调 接口状态消息资金,1 张新表。
 * 来源:DESIGN_阶段10.md § 3 + 项目阶段规划/10-阶段10-.../接口契约清单.md(POST /api/v1/pub/push/devices)
 *
 * 业务表清单(1):
 *   1. push_device — 三端 APP 设备 token 绑定记录
 */
export class Stage10Init1717287900000 implements MigrationInterface {
  name = 'Stage10Init1717287900000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE \`push_device\` (
        \`push_device_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`device_token\` VARCHAR(255) NOT NULL,
        \`principal_type\` VARCHAR(16) NOT NULL COMMENT 'customer|merchant|rider',
        \`principal_id\` BIGINT NOT NULL,
        \`platform\` VARCHAR(16) NOT NULL COMMENT 'ios|android|wxmp',
        \`app_type\` VARCHAR(16) NOT NULL COMMENT 'customer|merchant|rider',
        \`push_enabled\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`push_device_id\`),
        UNIQUE KEY \`uk_push_device_token\` (\`device_token\`, \`principal_type\`),
        KEY \`idx_push_device_principal\` (\`principal_type\`, \`principal_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='push 设备绑定'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `push_device`');
  }
}
