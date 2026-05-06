import type { DataSource } from 'typeorm';

import { seedAdminUser } from './admin-user.seed';
import { seedCitySites } from './city-site.seed';
import { seedDicts } from './dict.seed';
import { seedErrandPricing } from './errand-pricing.seed';
import { seedErrandTypes } from './errand-type.seed';
import { seedErrorCodes } from './error-code.seed';
import { seedPlatformCategories } from './platform-category.seed';
import { seedProhibitedItems } from './prohibited-item.seed';
import { seedRolesAndPermissions } from './role-permission.seed';
import { seedStage7SysConfig } from './sys-config-stage7.seed';
import { seedStage8SysConfig } from './sys-config-stage8.seed';
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

  // Stage 6 — 跑腿配置种子
  const errandTypeCount = await seedErrandTypes(ds);
  console.info(`[seed] errand_type: ${errandTypeCount}`);

  const errandPricingCount = await seedErrandPricing(ds);
  console.info(`[seed] errand_pricing: ${errandPricingCount}`);

  const prohibitedCount = await seedProhibitedItems(ds);
  console.info(`[seed] prohibited_item: ${prohibitedCount}`);

  // Stage 7 — 商家端订单售后结算配置
  const stage7CfgCount = await seedStage7SysConfig(ds);
  console.info(`[seed] sys_config (stage 7): ${stage7CfgCount}`);

  // Stage 8 — 骑手端调度轨迹收益考核配置
  const stage8CfgCount = await seedStage8SysConfig(ds);
  console.info(`[seed] sys_config (stage 8): ${stage8CfgCount}`);

  console.info('[seed] done');
}
