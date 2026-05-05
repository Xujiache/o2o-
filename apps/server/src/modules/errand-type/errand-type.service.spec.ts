import { NotFoundException } from '@nestjs/common';

import type { ErrandType } from '../../database/entities';

import { ErrandTypeService } from './errand-type.service';

interface FakeRow {
  typeCode: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';
  name: string;
  requiredFields: string[];
  description: string | null;
  enabled: number;
  sort: number;
}

function buildService(rows: FakeRow[]) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () => rows.filter((r) => r.enabled === 1).sort((a, b) => a.sort - b.sort)),
  };
  const repo: any = {
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn(async (opt: any) => {
      const code = opt?.where?.typeCode;
      return rows.find((r) => r.typeCode === code) ?? null;
    }),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new ErrandTypeService(repo);
}

const ROWS: FakeRow[] = [
  {
    typeCode: 'BUY',
    name: '帮我买',
    requiredFields: ['pickupAddress', 'deliveryAddress'],
    description: 'desc',
    enabled: 1,
    sort: 1,
  },
  {
    typeCode: 'DELIVER',
    name: '帮我送',
    requiredFields: ['pickupAddress', 'deliveryAddress'],
    description: null,
    enabled: 1,
    sort: 2,
  },
  {
    typeCode: 'HELP',
    name: '帮我办',
    requiredFields: ['deliveryAddress', 'taskDesc'],
    description: '',
    enabled: 0, // 禁用
    sort: 3,
  },
  {
    typeCode: 'CUSTOM',
    name: '自定义',
    requiredFields: ['taskDesc', 'budget'],
    description: '',
    enabled: 1,
    sort: 4,
  },
];

describe('ErrandTypeService', () => {
  it('list 仅返 enabled=1 且按 sort 升序', async () => {
    const svc = buildService(ROWS);
    const r = await svc.list();
    expect(r.list).toHaveLength(3);
    expect(r.list.map((x) => x.typeCode)).toEqual(['BUY', 'DELIVER', 'CUSTOM']);
  });

  it('list 字段映射:typeCode/name/requiredFields/description/enabled/sort', async () => {
    const svc = buildService(ROWS);
    const r = await svc.list();
    const buy = r.list[0]!;
    expect(buy.typeCode).toBe('BUY');
    expect(buy.name).toBe('帮我买');
    expect(buy.requiredFields).toEqual(['pickupAddress', 'deliveryAddress']);
    expect(buy.description).toBe('desc');
    expect(buy.enabled).toBe(1);
    expect(buy.sort).toBe(1);
  });

  it('description 为 null 时映射为空字符串', async () => {
    const svc = buildService(ROWS);
    const r = await svc.list();
    expect(r.list[1]!.description).toBe('');
  });

  it('cityCode 透传不影响查询(预留扩展)', async () => {
    const svc = buildService(ROWS);
    const r = await svc.list('GLOBAL');
    expect(r.list).toHaveLength(3);
  });

  it('findByCode 命中返实体', async () => {
    const svc = buildService(ROWS);
    const t = await svc.findByCode('BUY');
    expect(t.typeCode).toBe('BUY');
  });

  it('findByCode 未命中 / 已禁用都抛 NotFoundException', async () => {
    const svc = buildService(ROWS);
    await expect(svc.findByCode('HELP')).rejects.toBeInstanceOf(NotFoundException);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await expect(svc.findByCode('XXX' as any)).rejects.toBeInstanceOf(NotFoundException);
    /* eslint-enable @typescript-eslint/no-explicit-any */
  });

  it('空表 list 返空数组', async () => {
    const svc = buildService([]);
    const r = await svc.list();
    expect(r.list).toEqual([]);
  });
});
// 复用 ErrandType 类型断言以避免未使用的导入告警
const _typeCheck: ErrandType | null = null;
void _typeCheck;
