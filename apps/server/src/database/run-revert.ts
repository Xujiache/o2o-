/* eslint-disable no-console */
import { AppDataSource } from './data-source';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  console.info('[migrate:revert] data source initialized');
  await AppDataSource.undoLastMigration({ transaction: 'all' });
  console.info('[migrate:revert] reverted last migration');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('[migrate:revert] failed:', err);
  process.exit(1);
});
