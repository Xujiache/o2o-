import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { In, Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import { SysDict } from '../../database/entities';

import type { DictItemVo } from './dict.dto';

const CACHE_PREFIX = 'dict:v1:';
const CACHE_TTL = 300; // 5 minutes

@Injectable()
export class DictService {
  constructor(
    @InjectRepository(SysDict) private readonly repo: Repository<SysDict>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async query(typeList?: string[]): Promise<DictItemVo[]> {
    const cacheKey = `${CACHE_PREFIX}${typeList?.length ? typeList.slice().sort().join(',') : 'ALL'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as DictItemVo[];

    const where = typeList?.length ? { dictType: In(typeList), enabled: 1 } : { enabled: 1 };
    const rows = await this.repo.find({ where, order: { dictType: 'ASC', sort: 'ASC' } });
    const items: DictItemVo[] = rows.map((r) => ({
      dictType: r.dictType,
      code: r.code,
      label: r.label,
      sort: r.sort,
      enabled: r.enabled === 1,
      remark: r.remark,
    }));
    await this.redis.set(cacheKey, JSON.stringify(items), 'EX', CACHE_TTL);
    return items;
  }
}
