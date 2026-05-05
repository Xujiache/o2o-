import type { DataSource } from 'typeorm';

import { seedAdminUser } from './admin-user.seed';
import { seedCitySites } from './city-site.seed';
import { seedDicts } from './dict.seed';
import { seedErrorCodes } from './error-code.seed';
import { seedPlatformCategories } from './platform-category.seed';
import { seedRolesAndPermissions } from './role-permission.seed';
import { seedSysConfig } from './sys-config.seed';
import { seedThirdPartyConfig } from './third-party-config.seed';

export async function runSeeds(ds: DataSource): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('[seed] start');

  const errorCodeCount = await seedErrorCodes(ds);
  console.info(`[seed] sys_error_code: ${errorCodeCount}`);

  const dictCount = await seedDicts(ds);
  console.info(`[seed] sys_dict: ${dictCount}`);

  const rp = await seedRolesAndPermissions(ds);
  console.info(`[seed] sys_role: ${rp.roles}, sys_permission: ${rp.permissions}, sys_role_permission: ${rp.bindings}`);

  const cfg = await seedSysConfig(ds);
  console.info(`[seed] sys_config: ${cfg}`);

  const tp = await seedThirdPartyConfig(ds);
  console.info(`[seed] third_party_config: ${tp}`);

  // Stage 4
  const adminCount = await seedAdminUser(ds);
  console.info(`[seed] admin_user: ${adminCount}`);

  const cityCount = await seedCitySites(ds);
  console.info(`[seed] city_site: ${cityCount}`);

  const catCount = await seedPlatformCategories(ds);
  console.info(`[seed] platform_category: ${catCount}`);

  console.info('[seed] done');
}
