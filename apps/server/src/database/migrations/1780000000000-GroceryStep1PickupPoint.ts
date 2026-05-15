import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * GR-1 — 平台自营生鲜自提点表。
 *
 * - 平台自营模式下,用户下单时按距离选择;运营员在该点完成拣货/称重/核销。
 * - status: active / suspended / offline(软删)。
 * - lng/lat 用 DECIMAL(10,6) 精度足够 (~0.1m)。
 */
export class GroceryStep1PickupPoint1780000000000 implements MigrationInterface {
  name = 'GroceryStep1PickupPoint1780000000000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS \`pickup_point\` (
        \`pickup_point_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(64) NOT NULL,
        \`address\` VARCHAR(255) NOT NULL,
        \`city_code\` VARCHAR(16) NULL,
        \`lng\` DECIMAL(10,6) NOT NULL,
        \`lat\` DECIMAL(10,6) NOT NULL,
        \`business_hour_start\` VARCHAR(5) NOT NULL DEFAULT '09:00',
        \`business_hour_end\` VARCHAR(5) NOT NULL DEFAULT '21:00',
        \`contact_phone\` VARCHAR(32) NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',
        \`notice\` VARCHAR(255) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`pickup_point_id\`),
        KEY \`idx_pickup_point_status\` (\`status\`),
        KEY \`idx_pickup_point_city\` (\`city_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GR-1 自营自提点';
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `pickup_point`');
  }
}
