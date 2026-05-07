import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 跑腿订单加 pickup_code / delivery_code 两列。
 *
 * 业务规则:
 *  - DELIVER(代送): 同时生成 pickup_code + delivery_code
 *  - BUY / HELP / CUSTOM: 仅生成 delivery_code,pickup_code 为 NULL
 *
 * 历史数据:旧订单两列均 NULL,后续不再补码(只对新订单生效).
 */
export class ErrandPickupDeliveryCode1717892800000 implements MigrationInterface {
  name = 'ErrandPickupDeliveryCode1717892800000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(
      "ALTER TABLE `errand_order` ADD COLUMN `pickup_code` VARCHAR(8) NULL COMMENT '取件码(仅 DELIVER 生成)' AFTER `completed_at`",
    );
    await qr.query(
      "ALTER TABLE `errand_order` ADD COLUMN `delivery_code` VARCHAR(8) NULL COMMENT '收货码(全部类型均生成)' AFTER `pickup_code`",
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('ALTER TABLE `errand_order` DROP COLUMN `delivery_code`');
    await qr.query('ALTER TABLE `errand_order` DROP COLUMN `pickup_code`');
  }
}
