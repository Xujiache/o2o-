import type { DataSource } from 'typeorm';

import { PlatformCategory, type PlatformCategoryBizType } from '../entities';

const NOW = Date.now().toString();

interface Row {
  bizType: PlatformCategoryBizType;
  name: string;
  displayOrder: number;
}

const ROWS: Row[] = [
  // 外卖类目(8 顶级)
  { bizType: 'takeaway', name: '快餐便当', displayOrder: 1 },
  { bizType: 'takeaway', name: '中餐', displayOrder: 2 },
  { bizType: 'takeaway', name: '西餐', displayOrder: 3 },
  { bizType: 'takeaway', name: '日韩料理', displayOrder: 4 },
  { bizType: 'takeaway', name: '甜品饮品', displayOrder: 5 },
  { bizType: 'takeaway', name: '小吃夜宵', displayOrder: 6 },
  { bizType: 'takeaway', name: '早餐', displayOrder: 7 },
  { bizType: 'takeaway', name: '生鲜果蔬', displayOrder: 8 },
  // 跑腿类目(4 顶级)
  { bizType: 'errand', name: '帮我买', displayOrder: 1 },
  { bizType: 'errand', name: '帮我送', displayOrder: 2 },
  { bizType: 'errand', name: '帮我取', displayOrder: 3 },
  { bizType: 'errand', name: '帮我办', displayOrder: 4 },
];

/**
 * Stage 4 平台类目种子。仅顶级(parentId=0);二级类目由运营在平台 Web 添加。
 */
export async function seedPlatformCategories(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(PlatformCategory);
  let count = 0;
  for (const r of ROWS) {
    const existing = await repo.findOne({
      where: { bizType: r.bizType, parentId: '0', name: r.name },
    });
    if (existing) {
      existing.displayOrder = r.displayOrder;
      existing.updatedAt = NOW;
      await repo.save(existing);
    } else {
      await repo.insert({
        bizType: r.bizType,
        parentId: '0',
        name: r.name,
        iconUrl: null,
        displayOrder: r.displayOrder,
        enabled: 1,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
    count++;
  }
  return count;
}
