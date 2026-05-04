/* eslint-disable no-console */
import { AppDataSource } from './data-source';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  console.info('[migrate] data source initialized');
  const migrations = await AppDataSource.runMigrations({ transaction: 'all' });
  if (migrations.length === 0) {
    console.info('[migrate] no pending migrations');
  } else {
    console.info(`[migrate] applied ${migrations.length} migration(s):`);
    for (const m of migrations) console.info(`  + ${m.name}`);
  }
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
