import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProhibitedItem } from '../../database/entities';
import type { ProhibitedItemLevel } from '../../database/entities';

export interface ProhibitedHit {
  keyword: string;
  category: string;
  level: ProhibitedItemLevel;
  description: string;
}

@Injectable()
export class ProhibitedItemService {
  constructor(@InjectRepository(ProhibitedItem) private readonly repo: Repository<ProhibitedItem>) {}

  /**
   * 扫描 text 中是否命中违禁关键词。命中返数组(含 level WARN/REJECT)。
   * - 大小写不敏感(简单 toLowerCase 处理)
   * - 仅扫 enabled=1 的关键词
   * - 命中即返,不去重(同一关键词只在表中存 1 行,不会重复)
   */
  async check(text: string | null | undefined): Promise<ProhibitedHit[]> {
    if (!text) return [];
    const lower = text.toLowerCase();
    const items = await this.repo.createQueryBuilder('p').where('p.enabled = 1').getMany();
    const hits: ProhibitedHit[] = [];
    for (const it of items) {
      if (lower.includes(it.keyword.toLowerCase())) {
        hits.push({
          keyword: it.keyword,
          category: it.category,
          level: it.level,
          description: it.description,
        });
      }
    }
    return hits;
  }

  /** 是否包含 REJECT 级别命中 */
  static hasReject(hits: ProhibitedHit[]): boolean {
    return hits.some((h) => h.level === 'REJECT');
  }
}
