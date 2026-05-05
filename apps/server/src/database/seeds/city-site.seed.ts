import type { DataSource } from 'typeorm';

import { CitySite } from '../entities';

const NOW = Date.now().toString();

const ROWS: Array<{ cityCode: string; cityName: string; province: string; displayOrder: number }> = [
  { cityCode: 'BJ', cityName: '北京', province: '北京市', displayOrder: 1 },
  { cityCode: 'SH', cityName: '上海', province: '上海市', displayOrder: 2 },
  { cityCode: 'GZ', cityName: '广州', province: '广东省', displayOrder: 3 },
  { cityCode: 'SZ', cityName: '深圳', province: '广东省', displayOrder: 4 },
];

/**
 * Stage 4 城市站点种子。serviceArea 留空(NULL = 全城开放),平台运营再画 GeoJSON。
 */
export async function seedCitySites(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(CitySite);
  let count = 0;
  for (const r of ROWS) {
    const existing = await repo.findOne({ where: { cityCode: r.cityCode } });
    if (existing) {
      existing.cityName = r.cityName;
      existing.province = r.province;
      existing.displayOrder = r.displayOrder;
      existing.updatedAt = NOW;
      await repo.save(existing);
    } else {
      await repo.insert({
        cityCode: r.cityCode,
        cityName: r.cityName,
        province: r.province,
        serviceEnabled: 1,
        serviceArea: null,
        displayOrder: r.displayOrder,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
    count++;
  }
  return count;
}
