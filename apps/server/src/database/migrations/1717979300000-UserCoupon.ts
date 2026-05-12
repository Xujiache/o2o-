import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 用户优惠券领取关系表。
 *
 * 配套 `c/coupons/*` 接口(可领列表 / 领取 / 我的列表),把"用户领券"链路打通。
 * - 同一用户对同一张券模板限领 1 张:依赖唯一索引 `uk_user_coupon_customer_rule`
 * - 状态 EXPIRED 由查询时根据 coupon_rule.valid_to 实时判定,不入库
 */
export class UserCoupon1717979300000 implements MigrationInterface {
  name = 'UserCoupon1717979300000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE \`user_coupon\` (
        \`user_coupon_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`customer_id\` BIGINT NOT NULL,
        \`coupon_rule_id\` BIGINT NOT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'UNUSED',
        \`order_id\` BIGINT NULL,
        \`received_at\` BIGINT NOT NULL,
        \`used_at\` BIGINT NULL,
        PRIMARY KEY (\`user_coupon_id\`),
        UNIQUE KEY \`uk_user_coupon_customer_rule\` (\`customer_id\`, \`coupon_rule_id\`),
        KEY \`idx_user_coupon_customer_status\` (\`customer_id\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户领取的优惠券实例'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('DROP TABLE IF EXISTS `user_coupon`');
  }
}
