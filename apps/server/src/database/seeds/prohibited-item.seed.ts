import type { DataSource } from 'typeorm';

import { ProhibitedItem } from '../entities';
import type { ProhibitedItemLevel } from '../entities';

const NOW = Date.now().toString();

interface Row {
  keyword: string;
  category: string;
  level: ProhibitedItemLevel;
  description: string;
}

const ROWS: Row[] = [
  { keyword: '刀', category: '刀具', level: 'WARN', description: '可能涉及刀具,请确认非管制刀' },
  { keyword: '管制刀', category: '管制刀具', level: 'REJECT', description: '禁止配送管制刀具' },
  { keyword: '枪', category: '武器', level: 'REJECT', description: '禁止配送任何枪支类物品' },
  { keyword: '易燃', category: '危险品', level: 'REJECT', description: '禁止配送易燃物品' },
  { keyword: '爆炸', category: '危险品', level: 'REJECT', description: '禁止配送爆炸物品' },
  { keyword: '烟', category: '烟酒', level: 'WARN', description: '香烟需出示购买凭证' },
  { keyword: '酒', category: '烟酒', level: 'WARN', description: '酒类需出示购买凭证及成年人接收' },
  { keyword: '处方药', category: '药品', level: 'REJECT', description: '禁止代送处方药' },
  { keyword: '现金', category: '贵重品', level: 'WARN', description: '现金类物品需买保险' },
  { keyword: '毒', category: '违法物品', level: 'REJECT', description: '禁止配送毒品类物品' },
];

/** Stage 6 违禁品库种子(10 条 keyword) */
export async function seedProhibitedItems(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(ProhibitedItem);
  let count = 0;
  for (const r of ROWS) {
    const existing = await repo.findOne({ where: { keyword: r.keyword } });
    if (existing) {
      existing.category = r.category;
      existing.level = r.level;
      existing.description = r.description;
      existing.updatedAt = NOW;
      await repo.save(existing);
    } else {
      await repo.insert({
        keyword: r.keyword,
        category: r.category,
        level: r.level,
        description: r.description,
        enabled: 1,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
    count++;
  }
  return count;
}
