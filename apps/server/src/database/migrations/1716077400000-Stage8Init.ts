import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 8 — 骑手端调度轨迹收益考核,7 张新表。
 * 来源:DESIGN_阶段8.md § 3 数据表设计 + 规划文档 § 后端数据任务事件。
 *
 * 业务表清单(7):
 *   1. dispatch_task           — 派单流水
 *   2. rider_task              — 骑手任务主表
 *   3. track_point             — 轨迹点(任务粒度)
 *   4. rider_earning           — 骑手日级收益
 *   5. rider_withdrawal        — 骑手提现单
 *   6. rider_assessment        — 骑手月度考核
 *   7. rider_violation         — 骑手违规记录
 *
 * rider_status(stage 3)已含 device_token / lastHeartbeatAt / onlineStatus,本阶段不动 schema。
 *
 * 时间戳全 BIGINT 毫秒;金额 BIGINT 分;主键 `<table>_id` BIGINT auto-increment。
 */
export class Stage8Init1716077400000 implements MigrationInterface {
  name = 'Stage8Init1716077400000';

  async up(qr: QueryRunner): Promise<void> {
    // 1. dispatch_task
    await qr.query(`
      CREATE TABLE \`dispatch_task\` (
        \`dispatch_task_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`biz_order_id\` BIGINT NOT NULL,
        \`biz_task_id\` BIGINT NULL,
        \`candidate_rider_ids\` JSON NULL,
        \`accepted_rider_id\` BIGINT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`retry_count\` INT NOT NULL DEFAULT 0,
        \`dispatched_at\` BIGINT NOT NULL,
        \`timeout_at\` BIGINT NOT NULL,
        \`completed_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`dispatch_task_id\`),
        KEY \`idx_dispatch_task_biz\` (\`biz_type\`, \`biz_order_id\`),
        KEY \`idx_dispatch_task_status_timeout\` (\`status\`, \`timeout_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='派单流水'
    `);

    // 2. rider_task
    await qr.query(`
      CREATE TABLE \`rider_task\` (
        \`rider_task_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`dispatch_task_id\` BIGINT NOT NULL,
        \`rider_id\` BIGINT NOT NULL,
        \`biz_type\` VARCHAR(16) NOT NULL,
        \`biz_order_id\` BIGINT NOT NULL,
        \`biz_task_id\` BIGINT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'ASSIGNED',
        \`accepted_at\` BIGINT NOT NULL,
        \`arrived_pickup_at\` BIGINT NULL,
        \`picked_up_at\` BIGINT NULL,
        \`delivered_at\` BIGINT NULL,
        \`eta_at\` BIGINT NULL,
        \`exception_at\` BIGINT NULL,
        \`cancelled_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`rider_task_id\`),
        KEY \`idx_rider_task_rider_status\` (\`rider_id\`, \`status\`, \`created_at\`),
        KEY \`idx_rider_task_biz\` (\`biz_type\`, \`biz_order_id\`),
        KEY \`idx_rider_task_dispatch\` (\`dispatch_task_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='骑手任务主表'
    `);

    // 3. track_point
    await qr.query(`
      CREATE TABLE \`track_point\` (
        \`track_point_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_task_id\` BIGINT NOT NULL,
        \`rider_id\` BIGINT NOT NULL,
        \`lng\` DECIMAL(10,6) NOT NULL,
        \`lat\` DECIMAL(10,6) NOT NULL,
        \`accuracy\` INT NULL,
        \`speed\` DECIMAL(6,2) NULL,
        \`recorded_at\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`track_point_id\`),
        KEY \`idx_track_point_task_recorded\` (\`rider_task_id\`, \`recorded_at\`),
        KEY \`idx_track_point_rider_recorded\` (\`rider_id\`, \`recorded_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务轨迹点'
    `);

    // 4. rider_earning
    await qr.query(`
      CREATE TABLE \`rider_earning\` (
        \`rider_earning_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NOT NULL,
        \`settle_date\` INT NOT NULL,
        \`order_count\` INT NOT NULL DEFAULT 0,
        \`base_amount\` BIGINT NOT NULL DEFAULT 0,
        \`distance_amount\` BIGINT NOT NULL DEFAULT 0,
        \`timely_bonus\` BIGINT NOT NULL DEFAULT 0,
        \`reward_amount\` BIGINT NOT NULL DEFAULT 0,
        \`deduct_amount\` BIGINT NOT NULL DEFAULT 0,
        \`total_amount\` BIGINT NOT NULL DEFAULT 0,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`settled_at\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`rider_earning_id\`),
        UNIQUE KEY \`uk_rider_earning_rider_date\` (\`rider_id\`, \`settle_date\`),
        KEY \`idx_rider_earning_status\` (\`status\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='骑手日级收益'
    `);

    // 5. rider_withdrawal
    await qr.query(`
      CREATE TABLE \`rider_withdrawal\` (
        \`rider_withdrawal_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`withdrawal_no\` VARCHAR(32) NOT NULL,
        \`rider_id\` BIGINT NOT NULL,
        \`amount_cents\` BIGINT NOT NULL,
        \`account_id\` BIGINT NULL,
        \`status\` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        \`sms_code_hash\` VARCHAR(128) NULL,
        \`submitted_at\` BIGINT NOT NULL,
        \`completed_at\` BIGINT NULL,
        \`fail_reason\` VARCHAR(255) NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`rider_withdrawal_id\`),
        UNIQUE KEY \`uk_rider_withdrawal_no\` (\`withdrawal_no\`),
        KEY \`idx_rider_withdrawal_rider_status\` (\`rider_id\`, \`status\`, \`submitted_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='骑手提现单'
    `);

    // 6. rider_assessment
    await qr.query(`
      CREATE TABLE \`rider_assessment\` (
        \`rider_assessment_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NOT NULL,
        \`period\` INT NOT NULL,
        \`on_time_rate\` DECIMAL(5,4) NOT NULL DEFAULT 0,
        \`accept_rate\` DECIMAL(5,4) NOT NULL DEFAULT 0,
        \`complaint_rate\` DECIMAL(5,4) NOT NULL DEFAULT 0,
        \`avg_rating\` DECIMAL(3,2) NOT NULL DEFAULT 0,
        \`rank_in_city\` INT NULL,
        \`badges_json\` JSON NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`rider_assessment_id\`),
        UNIQUE KEY \`uk_rider_assessment_rider_period\` (\`rider_id\`, \`period\`),
        KEY \`idx_rider_assessment_period\` (\`period\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='骑手月度考核'
    `);

    // 7. rider_violation
    await qr.query(`
      CREATE TABLE \`rider_violation\` (
        \`rider_violation_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NOT NULL,
        \`rider_task_id\` BIGINT NULL,
        \`type\` VARCHAR(16) NOT NULL,
        \`description\` VARCHAR(500) NOT NULL,
        \`photos_json\` JSON NULL,
        \`deduct_cents\` BIGINT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'REPORTED',
        \`reported_at\` BIGINT NOT NULL,
        \`decided_at\` BIGINT NULL,
        \`decision\` VARCHAR(255) NULL,
        \`deducted_to_earning_id\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`rider_violation_id\`),
        KEY \`idx_rider_violation_rider_status\` (\`rider_id\`, \`status\`, \`created_at\`),
        KEY \`idx_rider_violation_task\` (\`rider_task_id\`),
        KEY \`idx_rider_violation_type_status\` (\`type\`, \`status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='骑手违规记录'
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS \`rider_violation\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_assessment\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_withdrawal\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_earning\``);
    await qr.query(`DROP TABLE IF EXISTS \`track_point\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_task\``);
    await qr.query(`DROP TABLE IF EXISTS \`dispatch_task\``);
  }
}
