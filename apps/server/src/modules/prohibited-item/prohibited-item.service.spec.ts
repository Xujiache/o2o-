import type { ProhibitedItem } from '../../database/entities';

import { ProhibitedItemService } from './prohibited-item.service';

interface FakeRow {
  keyword: string;
  category: string;
  level: 'WARN' | 'REJECT';
  description: string;
  enabled: number;
}

function buildService(rows: FakeRow[]) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => rows.filter((r) => r.enabled === 1)),
  };
  const repo: any = { createQueryBuilder: jest.fn(() => qb) };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new ProhibitedItemService(repo);
}

const ROWS: FakeRow[] = [
  { keyword: '刀', category: '刀具', level: 'WARN', description: '可能涉及刀具', enabled: 1 },
  { keyword: '管制刀', category: '管制刀具', level: 'REJECT', description: '禁止', enabled: 1 },
  { keyword: '酒', category: '烟酒', level: 'WARN', description: '需成年', enabled: 1 },
  { keyword: '毒', category: '违法物品', level: 'REJECT', description: '禁止毒品', enabled: 0 }, // 禁用
];

describe('ProhibitedItemService', () => {
  it('text 为空 / null / undefined 返空数组', async () => {
    const svc = buildService(ROWS);
    expect(await svc.check(null)).toEqual([]);
    expect(await svc.check(undefined)).toEqual([]);
    expect(await svc.check('')).toEqual([]);
  });

  it('命中 WARN 级别', async () => {
    const svc = buildService(ROWS);
    const hits = await svc.check('帮我买把水果刀');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.level).toBe('WARN');
    expect(hits[0]!.keyword).toBe('刀');
  });

  it('命中 REJECT 级别', async () => {
    const svc = buildService(ROWS);
    const hits = await svc.check('需要一把管制刀具');
    // 同时命中"刀"和"管制刀"
    expect(hits.some((h) => h.level === 'REJECT')).toBe(true);
  });

  it('多关键词同时命中', async () => {
    const svc = buildService(ROWS);
    const hits = await svc.check('需要管制刀和酒');
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });

  it('禁用关键词不命中', async () => {
    const svc = buildService(ROWS);
    const hits = await svc.check('运输毒品');
    expect(hits.find((h) => h.keyword === '毒')).toBeUndefined();
  });

  it('大小写不敏感', async () => {
    const rows: FakeRow[] = [{ keyword: 'KNIFE', category: 'k', level: 'REJECT', description: '', enabled: 1 }];
    const svc = buildService(rows);
    const hits = await svc.check('a small knife');
    expect(hits).toHaveLength(1);
  });

  it('hasReject 静态判断 helper', () => {
    expect(ProhibitedItemService.hasReject([{ keyword: '刀', category: '', level: 'WARN', description: '' }])).toBe(
      false,
    );
    expect(
      ProhibitedItemService.hasReject([{ keyword: '管制刀', category: '', level: 'REJECT', description: '' }]),
    ).toBe(true);
  });
});

const _typeCheck: ProhibitedItem | null = null;
void _typeCheck;
