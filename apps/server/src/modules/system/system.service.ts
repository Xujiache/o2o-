import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SysDict, ThirdPartyConfig } from '../../database/entities';

import type { CityVo, IntegrationHealthVo } from './system.dto';

const CITY_DICT_TYPE = 'city';

@Injectable()
export class SystemService {
  constructor(
    @InjectRepository(SysDict) private readonly dictRepo: Repository<SysDict>,
    @InjectRepository(ThirdPartyConfig) private readonly tpRepo: Repository<ThirdPartyConfig>,
  ) {}

  async listCities(keyword?: string, enabled?: boolean): Promise<CityVo[]> {
    const where: Record<string, unknown> = { dictType: CITY_DICT_TYPE };
    if (typeof enabled === 'boolean') {
      where.enabled = enabled ? 1 : 0;
    }
    let rows = await this.dictRepo.find({ where, order: { sort: 'ASC' } });
    if (keyword) {
      const kw = keyword.toLowerCase();
      rows = rows.filter((r) => r.code.includes(kw) || r.label.toLowerCase().includes(kw));
    }
    return rows.map((r) => ({
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
