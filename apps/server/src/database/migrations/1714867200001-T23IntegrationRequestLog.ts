import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * T23 新增简化表 integration_request_log,供 ThirdPartyRetryJob 扫描重试。
 * 单独 migration,避免污染 Stage0Init。
 */
export class T23IntegrationRequestLog1714867200001 implements MigrationInterface {
  name = 'T23IntegrationRequestLog1714867200001';

  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE \`integration_request_log\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`provider\` varchar(32) NOT NULL,
        \`request_id\` varchar(64) NOT NULL,
        \`endpoint\` varchar(256) NOT NULL,
        \`request_payload\` mediumtext NULL,
        \`response_payload\` mediumtext NULL,
        \`status\` enum('pending','success','failed','retrying') NOT NULL DEFAULT 'pending',
        \`error_message\` varchar(512) NULL,
        \`retry_count\` int NOT NULL DEFAULT 0,
        \`next_retry_at\` bigint NULL,
        \`created_at\` bigint NOT NULL,
        \`updated_at\` bigint NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`idx_irl_provider_request_id\` (\`provider\`, \`request_id\`),
        INDEX \`idx_irl_status_next_retry\` (\`status\`, \`next_retry_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE \`integration_request_log\``);
  }
}
