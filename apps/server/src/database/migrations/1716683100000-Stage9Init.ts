import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 9 — 平台管理端 Web 调度售后运营财务,10 张新表。
 * 来源:DESIGN_阶段9.md § 2 + 项目阶段规划/09-阶段9-.../后端数据任务事件.md
 *
 * 业务表清单(10):
 *   1. dispatch_rule              — 调度规则
 *   2. manual_dispatch_log        — 人工派单流水
 *   3. after_sale_arbitration     — 售后仲裁记录
 *   4. refund_order               — 退款单
 *   5. coupon_rule                — 优惠券规则
 *   6. points_rule                — 积分规则(占位)
 *   7. rate_rule                  — 费率规则
 *   8. dashboard_snapshot         — 数据大屏快照
 *   9. export_task                — 导出任务
 *  10. risk_exception_log         — 异常订单日志
 */
export class Stage9Init1716683100000 implements MigrationInterface {
  name = 'Stage9Init1716683100000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE \`dispatch_rule\` (
        \`dispatch_rule_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rule_name\` VARCHAR(100) NOT NULL,
        \`city_code\` VARCHAR(20) NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`algorithm\` VARCHAR(40) NOT NULL,
        \`config\` JSON NULL,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        \`created_by\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`dispatch_rule_id\`),
        KEY \`idx_dispatch_rule_city_biz\` (\`city_code\`, \`biz_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='调度规则'
    `);

    await qr.query(`
      CREATE TABLE \`manual_dispatch_log\` (
        \`log_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`dispatch_task_id\` BIGINT NOT NULL,
        \`rider_id\` BIGINT NOT NULL,
        \`operator_admin_id\` BIGINT NOT NULL,
        \`reason\` VARCHAR(255) NULL,
        \`before_status\` VARCHAR(20) NOT NULL,
        \`after_status\` VARCHAR(20) NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`log_id\`),
        KEY \`idx_manual_dispatch_log_task\` (\`dispatch_task_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='人工派单流水'
    `);

    await qr.query(`
      CREATE TABLE \`after_sale_arbitration\` (
        \`arbitration_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`after_sale_id\` BIGINT NOT NULL,
        \`responsible_party\` VARCHAR(16) NOT NULL,
        \`decision\` VARCHAR(16) NOT NULL,
        \`refund_amount\` BIGINT NOT NULL DEFAULT 0,
        \`penalty\` BIGINT NOT NULL DEFAULT 0,
        \`remark\` VARCHAR(500) NULL,
        \`operator_admin_id\` BIGINT NOT NULL,
        \`refund_order_id\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`arbitration_id\`),
        KEY \`idx_arbitration_after_sale\` (\`after_sale_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='售后仲裁记录'
    `);

    await qr.query(`
      CREATE TABLE \`refund_order\` (
        \`refund_order_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`refund_no\` VARCHAR(40) NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`biz_order_id\` BIGINT NOT NULL,
        \`payment_order_id\` BIGINT NULL,
        \`amount\` BIGINT NOT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`provider\` VARCHAR(20) NOT NULL DEFAULT 'wxpay',
        \`provider_refund_id\` VARCHAR(80) NULL,
        \`error_message\` VARCHAR(500) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`refund_order_id\`),
        UNIQUE KEY \`idx_refund_order_no\` (\`refund_no\`),
        KEY \`idx_refund_order_biz\` (\`biz_type\`, \`biz_order_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款单'
    `);

    await qr.query(`
      CREATE TABLE \`coupon_rule\` (
        \`coupon_rule_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`coupon_name\` VARCHAR(100) NOT NULL,
        \`coupon_type\` VARCHAR(16) NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`threshold\` BIGINT NOT NULL DEFAULT 0,
        \`discount\` BIGINT NOT NULL,
        \`total_stock\` INT NOT NULL DEFAULT 0,
        \`remain_stock\` INT NOT NULL DEFAULT 0,
        \`valid_from\` BIGINT NOT NULL,
        \`valid_to\` BIGINT NOT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
        \`created_by\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`coupon_rule_id\`),
        KEY \`idx_coupon_rule_status_valid\` (\`status\`, \`valid_to\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优惠券规则'
    `);

    await qr.query(`
      CREATE TABLE \`points_rule\` (
        \`points_rule_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rule_name\` VARCHAR(100) NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`trigger_event\` VARCHAR(32) NOT NULL,
        \`points\` INT NOT NULL,
        \`enabled\` TINYINT NOT NULL DEFAULT 1,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`points_rule_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分规则(占位)'
    `);

    await qr.query(`
      CREATE TABLE \`rate_rule\` (
        \`rate_rule_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`city_code\` VARCHAR(20) NOT NULL,
        \`category_id\` BIGINT NULL,
        \`merchant_commission_rate\` INT NOT NULL DEFAULT 0,
        \`rider_service_fee\` BIGINT NOT NULL DEFAULT 0,
        \`withdraw_fee_rate\` INT NOT NULL DEFAULT 0,
        \`settlement_cycle\` VARCHAR(16) NOT NULL DEFAULT 'T1',
        \`effective_at\` BIGINT NOT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`operator_admin_id\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`rate_rule_id\`),
        KEY \`idx_rate_rule_city_effective\` (\`city_code\`, \`effective_at\`),
        KEY \`idx_rate_rule_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='费率规则'
    `);

    await qr.query(`
      CREATE TABLE \`dashboard_snapshot\` (
        \`snapshot_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`snapshot_date\` VARCHAR(10) NOT NULL,
        \`city_code\` VARCHAR(20) NOT NULL,
        \`gmv\` BIGINT NOT NULL DEFAULT 0,
        \`order_count\` INT NOT NULL DEFAULT 0,
        \`active_users\` INT NOT NULL DEFAULT 0,
        \`online_riders\` INT NOT NULL DEFAULT 0,
        \`exception_orders\` INT NOT NULL DEFAULT 0,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`snapshot_id\`),
        UNIQUE KEY \`idx_dashboard_snapshot_date_city\` (\`snapshot_date\`, \`city_code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据大屏快照'
    `);

    await qr.query(`
      CREATE TABLE \`export_task\` (
        \`export_task_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`export_no\` VARCHAR(40) NOT NULL,
        \`export_type\` VARCHAR(40) NOT NULL,
        \`query_params\` JSON NULL,
        \`operator_admin_id\` BIGINT NOT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`file_url\` VARCHAR(500) NULL,
        \`error_message\` VARCHAR(500) NULL,
        \`row_count\` INT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`export_task_id\`),
        UNIQUE KEY \`idx_export_task_no\` (\`export_no\`),
        KEY \`idx_export_task_status\` (\`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导出任务'
    `);

    await qr.query(`
      CREATE TABLE \`risk_exception_log\` (
        \`log_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`exception_type\` VARCHAR(40) NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`biz_order_id\` BIGINT NOT NULL,
        \`severity\` VARCHAR(16) NOT NULL DEFAULT 'LOW',
        \`description\` VARCHAR(500) NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'OPEN',
        \`handler_admin_id\` BIGINT NULL,
        \`handled_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`log_id\`),
        KEY \`idx_risk_exception_status\` (\`status\`),
        KEY \`idx_risk_exception_biz\` (\`biz_type\`, \`biz_order_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='异常订单日志'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    for (const t of [
      'risk_exception_log',
      'export_task',
      'dashboard_snapshot',
      'rate_rule',
      'points_rule',
      'coupon_rule',
      'refund_order',
      'after_sale_arbitration',
      'manual_dispatch_log',
      'dispatch_rule',
    ]) {
      await qr.query(`DROP TABLE IF EXISTS \`${t}\``);
    }
  }
}
