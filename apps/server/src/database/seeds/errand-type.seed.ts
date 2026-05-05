import type { DataSource } from 'typeorm';

import { ErrandType } from '../entities';
import type { ErrandOrderTypeCode } from '../entities';

const NOW = Date.now().toString();

interface Row {
  typeCode: ErrandOrderTypeCode;
  name: string;
  requiredFields: string[];
  description: string;
  sort: number;
}

const ROWS: Row[] = [
  {
    typeCode: 'BUY',
    name: '帮我买',
    requiredFields: ['pickupAddress', 'deliveryAddress', 'budget', 'itemDesc'],
    description: '代买:用户提供取货商家与收货地址,骑手垫付购买',
    sort: 1,
  },
  {
    typeCode: 'DELIVER',
    name: '帮我送',
    requiredFields: ['pickupAddress', 'deliveryAddress', 'weight', 'itemDesc'],
    description: '代送:同城点对点送物品,无需垫付',
    sort: 2,
  },
  {
    typeCode: 'HELP',
    name: '帮我办',
    requiredFields: ['deliveryAddress', 'taskDesc', 'budget'],
    description: '代办:跑腿办事,如取快递、排队、缴费',
    sort: 3,
  },
  {
    typeCode: 'CUSTOM',
    name: '自定义需求',
    requiredFields: ['taskDesc', 'budget'],
    description: '自定义需求,详情自由描述',
    sort: 4,
  },
];

/** Stage 6 跑腿类型 4 条种子 */
export async function seedErrandTypes(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(ErrandType);
  let count = 0;
  for (const r of ROWS) {
    const existing = await repo.findOne({ where: { typeCode: r.typeCode } });
    if (existing) {
      existing.name = r.name;
      existing.requiredFields = r.requiredFields;
      existing.description = r.description;
      existing.sort = r.sort;
      existing.updatedAt = NOW;
      await repo.save(existing);
    } else {
      await repo.insert({
        typeCode: r.typeCode,
        name: r.name,
        requiredFields: r.requiredFields,
        description: r.description,
        enabled: 1,
        sort: r.sort,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
    count++;
  }
  return count;
}
