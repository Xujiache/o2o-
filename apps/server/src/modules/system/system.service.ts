import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CitySite, SysDict, ThirdPartyConfig } from '../../database/entities';

import type { CityVo, IntegrationHealthVo } from './system.dto';

const CITY_DICT_TYPE = 'city';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(SysDict) private readonly dictRepo: Repository<SysDict>,
    @InjectRepository(ThirdPartyConfig) private readonly tpRepo: Repository<ThirdPartyConfig>,
    @InjectRepository(CitySite) private readonly cityRepo: Repository<CitySite>,
  ) {}

  /**
   * stage 4 起优先读 city_site 权威表;空表时回落到 sys_dict 'city' 兼容(兼容老 seed)。
   */
  async listCities(keyword?: string, enabled?: boolean): Promise<CityVo[]> {
    const qb = this.cityRepo.createQueryBuilder('c');
    if (typeof enabled === 'boolean') {
      qb.andWhere('c.service_enabled = :se', { se: enabled ? 1 : 0 });
    }
    qb.orderBy('c.display_order', 'ASC').addOrderBy('c.city_site_id', 'ASC');
    let rows = await qb.getMany();
    if (rows.length > 0) {
      if (keyword) {
        const kw = keyword.toLowerCase();
        rows = rows.filter((r) => r.cityCode.toLowerCase().includes(kw) || r.cityName.toLowerCase().includes(kw));
      }
      return rows.map((r) => ({
        cityCode: r.cityCode,
        cityName: r.cityName,
        province: r.province ?? null,
        serviceEnabled: r.serviceEnabled === 1,
      }));
    }
    // legacy fallback
    const where: Record<string, unknown> = { dictType: CITY_DICT_TYPE };
    if (typeof enabled === 'boolean') where.enabled = enabled ? 1 : 0;
    let dictRows = await this.dictRepo.find({ where, order: { sort: 'ASC' } });
    if (keyword) {
      const kw = keyword.toLowerCase();
      dictRows = dictRows.filter((r) => r.code.includes(kw) || r.label.toLowerCase().includes(kw));
    }
    return dictRows.map((r) => ({
      cityCode: r.code,
      cityName: r.label,
      province: r.remark,
      serviceEnabled: r.enabled === 1,
    }));
  }

  async listIntegrationsHealth(provider?: string): Promise<IntegrationHealthVo[]> {
    const env = process.env.NODE_ENV ?? 'development';
    const where: Record<string, unknown> = { env };
    if (provider) where.provider = provider;
    const rows = await this.tpRepo.find({ where, order: { provider: 'ASC' } });
    return rows.map((r) => ({
      provider: r.provider,
      status: r.status,
      lastCheckedAt: r.lastHealthAt ? Number(r.lastHealthAt) : null,
      errorMessage: r.errorMessage,
    }));
  }
}
