import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CustomerProfileBio1717979400000 implements MigrationInterface {
  name = 'CustomerProfileBio1717979400000';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query('ALTER TABLE `customer_profile` ADD `bio` VARCHAR(120) NULL AFTER `birthday`');
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query('ALTER TABLE `customer_profile` DROP COLUMN `bio`');
  }
}
