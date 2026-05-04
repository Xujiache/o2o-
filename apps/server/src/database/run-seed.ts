/* eslint-disable no-console */
import { AppDataSource } from './data-source';
import { runSeeds } from './seeds';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  await runSeeds(AppDataSource);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
