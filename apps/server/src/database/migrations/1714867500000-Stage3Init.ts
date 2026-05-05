import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage 3 — 骑手端 APP 入驻接单与配送基础,初始化 8 张业务表。
 * 来源:DESIGN_阶段3.md § 3 数据表设计。
 *
 * 表清单:
 *   1. rider_account         — 骑手主账号(approved 后填权威字段)
 *   2. rider_application     — 入驻申请(可重复提交,审核 4 状态)
 *   3. rider_certificate     — 资质文件关联(身份证正/反 + 人脸 + 健康证 + 驾驶证 + 行驶证)
 *   4. rider_vehicle         — 车辆信息
 *   5. rider_service_area    — 配送区域(GeoJSON Polygon,1:1 to rider)
 *   6. rider_status          — 在线状态 + 心跳 + 设备 + 信用分(1:1 to rider)
 *   7. rider_location        — 位置上报明细(7 天清理)
 *   8. rider_audit_log       — 骑手生命周期审计日志
 *
 * 时间戳沿用 stage 0/1/2 BIGINT 毫秒约定;经纬度 DECIMAL(10,6)。
 */
export class Stage3Init1714867500000 implements MigrationInterface {
  name = 'Stage3Init1714867500000';

  async up(qr: QueryRunner): Promise<void> {
    // rider_account
    await qr.query(`
      CREATE TABLE \`rider_account\` (
        \`rider_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`mobile\` VARCHAR(20) NOT NULL,
        \`account_status\` ENUM('active','disabled') NOT NULL DEFAULT 'active',
        \`real_name\` VARCHAR(50) NULL,
        \`id_card_no\` VARCHAR(18) NULL,
        \`health_cert_no\` VARCHAR(50) NULL,
        \`health_cert_expiry\` BIGINT NULL,
        \`approved_at\` BIGINT NULL,
        \`approved_application_id\` BIGINT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        \`deleted_at\` BIGINT NULL,
        PRIMARY KEY (\`rider_id\`),
        UNIQUE KEY \`uk_rider_mobile\` (\`mobile\`),
        KEY \`idx_rider_status\` (\`account_status\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // rider_application
    await qr.query(`
      CREATE TABLE \`rider_application\` (
        \`application_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NULL,
        \`mobile\` VARCHAR(20) NOT NULL,
        \`real_name\` VARCHAR(50) NOT NULL,
        \`id_card_no\` VARCHAR(18) NOT NULL,
        \`health_cert_no\` VARCHAR(50) NOT NULL,
        \`health_cert_expiry\` BIGINT NOT NULL,
        \`audit_status\` ENUM('pending','approved','rejected','disabled') NOT NULL DEFAULT 'pending',
        \`reject_reason\` VARCHAR(500) NULL,
        \`audited_at\` BIGINT NULL,
        \`audited_by\` BIGINT NULL,
        \`submitted_at\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`application_id\`),
        KEY \`idx_rider_app_mobile_submitted\` (\`mobile\`, \`submitted_at\`),
        KEY \`idx_rider_app_audit_status\` (\`audit_status\`, \`submitted_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // rider_certificate
    await qr.query(`
      CREATE TABLE \`rider_certificate\` (
        \`certificate_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`application_id\` BIGINT NOT NULL,
        \`cert_type\` ENUM('id_card_front','id_card_back','face_video','health_cert','driver_license','vehicle_license') NOT NULL,
        \`file_object_id\` VARCHAR(64) NOT NULL,
        \`extra\` JSON NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`certificate_id\`),
        UNIQUE KEY \`uk_rider_cert_app_type\` (\`application_id\`, \`cert_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // rider_vehicle
    await qr.query(`
      CREATE TABLE \`rider_vehicle\` (
        \`vehicle_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NOT NULL,
        \`vehicle_type\` ENUM('electric_bike','motorcycle','car') NOT NULL,
        \`plate_no\` VARCHAR(20) NULL,
        \`brand\` VARCHAR(50) NULL,
        \`status\` ENUM('active','inactive') NOT NULL DEFAULT 'active',
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`vehicle_id\`),
        KEY \`idx_rider_vehicle\` (\`rider_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // rider_service_area
    await qr.query(`
      CREATE TABLE \`rider_service_area\` (
        \`service_area_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NOT NULL,
        \`geometry\` JSON NOT NULL,
        \`max_concurrent_orders\` INT NOT NULL DEFAULT 3,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`service_area_id\`),
        UNIQUE KEY \`uk_rider_service_area\` (\`rider_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // rider_status
    await qr.query(`
      CREATE TABLE \`rider_status\` (
        \`status_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NOT NULL,
        \`online_status\` ENUM('online','offline','busy') NOT NULL DEFAULT 'offline',
        \`current_lng\` DECIMAL(10,6) NULL,
        \`current_lat\` DECIMAL(10,6) NULL,
        \`last_heartbeat_at\` BIGINT NULL,
        \`device_token\` VARCHAR(255) NULL,
        \`platform\` ENUM('android','ios') NULL,
        \`credit_score\` INT NOT NULL DEFAULT 100,
        \`created_at\` BIGINT NOT NULL,
        \`updated_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`status_id\`),
        UNIQUE KEY \`uk_rider_status\` (\`rider_id\`),
        KEY \`idx_rider_online_heartbeat\` (\`online_status\`, \`last_heartbeat_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // rider_location
    await qr.query(`
      CREATE TABLE \`rider_location\` (
        \`location_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NOT NULL,
        \`lng\` DECIMAL(10,6) NOT NULL,
        \`lat\` DECIMAL(10,6) NOT NULL,
        \`accuracy\` INT NULL,
        \`batch_id\` VARCHAR(64) NOT NULL,
        \`reported_at\` BIGINT NOT NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`location_id\`),
        KEY \`idx_rider_location_rider_reported\` (\`rider_id\`, \`reported_at\`),
        KEY \`idx_rider_location_reported\` (\`reported_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // rider_audit_log
    await qr.query(`
      CREATE TABLE \`rider_audit_log\` (
        \`audit_log_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`rider_id\` BIGINT NULL,
        \`application_id\` BIGINT NULL,
        \`event_type\` ENUM('submitted','approved','rejected','disabled','enabled','online','offline','health_cert_expiring','health_cert_expired','location_batch','audit_timeout') NOT NULL,
        \`operator_type\` ENUM('rider','admin','system') NOT NULL,
        \`operator_id\` BIGINT NULL,
        \`detail\` JSON NULL,
        \`created_at\` BIGINT NOT NULL,
        PRIMARY KEY (\`audit_log_id\`),
        KEY \`idx_rider_audit_rider_created\` (\`rider_id\`, \`created_at\`),
        KEY \`idx_rider_audit_event\` (\`event_type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS \`rider_audit_log\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_location\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_status\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_service_area\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_vehicle\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_certificate\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_application\``);
    await qr.query(`DROP TABLE IF EXISTS \`rider_account\``);
  }
}
