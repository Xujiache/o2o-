/**
 * 演示数据种子(GR-7 重写)— 平台自营生鲜版本
 *
 * 用途:演示环境一键塞入"自营生鲜商城"的可视数据
 *
 * 幂等:每条按业务唯一字段(mobile / batchNo / name)反查,存在则跳过
 *
 * 包含:
 *   1 测试用户(13900000001,已实名,默认地址=北京天安门附近)
 *   1 测试骑手(13900030001) — 跑腿业务保留所需
 *   3 个自提点(天安门 / 王府井 / 国贸)
 *   2 个生鲜分类(禽类 / 蔬菜)
 *   8 个生鲜 SKU
 *   2 个溯源档案(土鸡批次)+ 1 个二维码批次 + 100 个 blank 二维码
 */
import type { DataSource } from 'typeorm';

import { encodeQrcode } from '../../modules/traceability/qrcode-encoder.util';
import {
  CustomerAddress,
  CustomerProfile,
  CustomerUser,
  GroceryCategory,
  GroceryProduct,
  MessageSetting,
  PickupPoint,
  QrcodeBatch,
  RiderAccount,
  RiderApplication,
  RiderServiceArea,
  RiderStatus,
  TraceabilityArchive,
  TraceabilityQrcode,
} from '../entities';

const NOW = Date.now().toString();

interface DemoStat {
  customers: number;
  riders: number;
  pickupPoints: number;
  groceryCategories: number;
  groceryProducts: number;
  archives: number;
  qrcodes: number;
}

export async function seedDemoData(ds: DataSource): Promise<DemoStat> {
  const stat: DemoStat = {
    customers: 0,
    riders: 0,
    pickupPoints: 0,
    groceryCategories: 0,
    groceryProducts: 0,
    archives: 0,
    qrcodes: 0,
  };

  await seedCustomer(ds, stat);
  await seedRider(ds, stat);
  await seedPickupPoints(ds, stat);
  const categoryMap = await seedGroceryCategories(ds, stat);
  await seedGroceryProducts(ds, categoryMap, stat);
  await seedTraceability(ds, stat);

  return stat;
}

/* ============ 1. 客户 ============ */
async function seedCustomer(ds: DataSource, stat: DemoStat): Promise<void> {
  const userRepo = ds.getRepository(CustomerUser);
  const profRepo = ds.getRepository(CustomerProfile);
  const msgRepo = ds.getRepository(MessageSetting);
  const addrRepo = ds.getRepository(CustomerAddress);

  const mobile = '13900000001';
  let user = await userRepo.findOne({ where: { mobile } });
  if (!user) {
    user = await userRepo.save(
      userRepo.create({
        mobile,
        wechatOpenId: null,
        accountStatus: 'active',
        realnameStatus: 'verified',
        profileCompleted: 1,
        registerSource: 'mobile',
        registerDeviceId: 'demo-seed',
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    await profRepo.insert({
      userId: user.userId,
      nickname: '测试用户',
      avatarUrl: null,
      gender: 'unknown',
      birthday: null,
      updatedAt: NOW,
    });
    await msgRepo.insert({
      userId: user.userId,
      orderNotify: 1,
      activityNotify: 1,
      smsNotify: 1,
      updatedAt: NOW,
    });
    stat.customers += 1;
  }

  const existingAddr = await addrRepo.findOne({ where: { userId: user.userId, isDefault: 1 } });
  if (!existingAddr) {
    await addrRepo.insert({
      userId: user.userId,
      receiverName: '测试用户',
      mobile,
      cityCode: 'BJ',
      detail: '北京市东城区东长安街 1 号',
      lng: '116.397428',
      lat: '39.90923',
      isDefault: 1,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

/* ============ 2. 骑手(跑腿业务保留) ============ */
async function seedRider(ds: DataSource, stat: DemoStat): Promise<void> {
  const acctRepo = ds.getRepository(RiderAccount);
  const appRepo = ds.getRepository(RiderApplication);
  const statusRepo = ds.getRepository(RiderStatus);

  const mobile = '13900030001';
  let acct = await acctRepo.findOne({ where: { mobile } });
  if (!acct) {
    acct = await acctRepo.save(
      acctRepo.create({
        mobile,
        accountStatus: 'active',
        realName: '小李',
        idCardNo: '110101199001011234',
        healthCertNo: 'BJ-HC-2026-0001',
        healthCertExpiry: String(Date.now() + 365 * 86400 * 1000),
        approvedAt: NOW,
        approvedApplicationId: null,
        createdAt: NOW,
        updatedAt: NOW,
        deletedAt: null,
      }),
    );
    stat.riders += 1;
  }

  const existingApp = await appRepo.findOne({ where: { mobile, auditStatus: 'approved' } });
  if (!existingApp) {
    const app = await appRepo.save(
      appRepo.create({
        riderId: acct.riderId,
        mobile,
        realName: '小李',
        idCardNo: '110101199001011234',
        healthCertNo: 'BJ-HC-2026-0001',
        healthCertExpiry: String(Date.now() + 365 * 86400 * 1000),
        auditStatus: 'approved',
        rejectReason: null,
        auditedAt: NOW,
        auditedBy: '1',
        submittedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    await acctRepo.update(acct.riderId, { approvedApplicationId: app.applicationId, updatedAt: NOW });
  }

  const existingStatus = await statusRepo.findOne({ where: { riderId: acct.riderId } });
  if (!existingStatus) {
    await statusRepo.insert({
      riderId: acct.riderId,
      onlineStatus: 'online',
      currentLng: '116.397428',
      currentLat: '39.90923',
      lastHeartbeatAt: NOW,
      deviceToken: 'demo-device-token',
      platform: 'android',
      creditScore: 100,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  const areaRepo = ds.getRepository(RiderServiceArea);
  const existingArea = await areaRepo.findOne({ where: { riderId: acct.riderId } });
  if (!existingArea) {
    await areaRepo.insert({
      riderId: acct.riderId,
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [116.34, 39.86],
            [116.45, 39.86],
            [116.45, 39.95],
            [116.34, 39.95],
            [116.34, 39.86],
          ],
        ],
      },
      maxConcurrentOrders: 3,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }
}

/* ============ 3. 自提点 ============ */
async function seedPickupPoints(ds: DataSource, stat: DemoStat): Promise<void> {
  const repo = ds.getRepository(PickupPoint);
  const points = [
    {
      name: '天安门自提点',
      address: '北京市东城区东长安街 1 号',
      lng: '116.397428',
      lat: '39.90923',
      phone: '010-65235678',
    },
    {
      name: '王府井自提点',
      address: '北京市东城区王府井大街 88 号',
      lng: '116.418',
      lat: '39.914',
      phone: '010-65124323',
    },
    {
      name: '国贸自提点',
      address: '北京市朝阳区建国门外大街 1 号',
      lng: '116.46',
      lat: '39.91',
      phone: '010-65052345',
    },
  ];
  for (const p of points) {
    const existing = await repo.findOne({ where: { name: p.name } });
    if (existing) continue;
    await repo.insert({
      name: p.name,
      address: p.address,
      cityCode: 'BJ',
      lng: p.lng,
      lat: p.lat,
      businessHourStart: '09:00',
      businessHourEnd: '21:00',
      contactPhone: p.phone,
      status: 'active',
      notice: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    stat.pickupPoints += 1;
  }
}

/* ============ 4. 生鲜分类 ============ */
async function seedGroceryCategories(ds: DataSource, stat: DemoStat): Promise<Record<string, string>> {
  const repo = ds.getRepository(GroceryCategory);
  const cats = [
    { name: '禽类', order: 1 },
    { name: '蔬菜', order: 2 },
  ];
  const map: Record<string, string> = {};
  for (const c of cats) {
    const existing = await repo.findOne({ where: { name: c.name } });
    if (existing) {
      map[c.name] = existing.categoryId;
      continue;
    }
    const saved = await repo.save(
      repo.create({
        name: c.name,
        iconFileId: null,
        displayOrder: c.order,
        status: 'active',
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    map[c.name] = saved.categoryId;
    stat.groceryCategories += 1;
  }
  return map;
}

/* ============ 5. 生鲜商品 ============ */
async function seedGroceryProducts(ds: DataSource, catMap: Record<string, string>, stat: DemoStat): Promise<void> {
  const repo = ds.getRepository(GroceryProduct);
  const products = [
    {
      cat: '禽类',
      name: '散养土鸡',
      priceFen: 3500,
      perJin: 1500,
      stockJin: 50,
      desc: '180 天散养,可溯源',
      trace: true,
    },
    { cat: '禽类', name: '鸭子', priceFen: 2800, perJin: 1800, stockJin: 30, desc: '麻鸭,适合炖汤', trace: true },
    { cat: '禽类', name: '老母鸡', priceFen: 4200, perJin: 2000, stockJin: 20, desc: '2年龄,煲汤上佳', trace: true },
    { cat: '蔬菜', name: '有机青菜', priceFen: 600, perJin: 500, stockJin: 100, desc: '当日采摘', trace: false },
    { cat: '蔬菜', name: '土豆', priceFen: 300, perJin: 500, stockJin: 200, desc: '内蒙古黄土豆', trace: false },
    { cat: '蔬菜', name: '番茄', priceFen: 800, perJin: 500, stockJin: 80, desc: '沙瓤番茄,生吃绝佳', trace: false },
    { cat: '蔬菜', name: '萝卜', priceFen: 250, perJin: 500, stockJin: 150, desc: '冬储萝卜', trace: false },
    { cat: '蔬菜', name: '黄瓜', priceFen: 500, perJin: 300, stockJin: 90, desc: '密植黄瓜,口感脆嫩', trace: false },
  ];
  for (const p of products) {
    const existing = await repo.findOne({ where: { name: p.name } });
    if (existing) continue;
    await repo.insert({
      categoryId: catMap[p.cat]!,
      name: p.name,
      coverImageFileId: null,
      description: p.desc,
      isWeighted: 1,
      unitPriceCentsPerJin: String(p.priceFen),
      estimatedWeightGrams: p.perJin,
      stockJin: p.stockJin.toFixed(2),
      saleStatus: 'on_shelf',
      hasTraceability: p.trace ? 1 : 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    stat.groceryProducts += 1;
  }
}

/* ============ 6. 溯源档案 + 二维码 ============ */
async function seedTraceability(ds: DataSource, stat: DemoStat): Promise<void> {
  const archRepo = ds.getRepository(TraceabilityArchive);
  const qrRepo = ds.getRepository(TraceabilityQrcode);
  const batchRepo = ds.getRepository(QrcodeBatch);

  // 档案 1
  let arch1 = await archRepo.findOne({ where: { batchNo: 'DEMO-2026-A001' } });
  if (!arch1) {
    arch1 = await archRepo.save(
      archRepo.create({
        productId: null,
        batchNo: 'DEMO-2026-A001',
        farmName: '北京顺义有机散养基地',
        farmAddress: '北京市顺义区李桥镇 X 路',
        breedDate: String(Date.now() - 180 * 86400 * 1000),
        slaughterDate: String(Date.now() - 86400 * 1000),
        weightGrams: 1500,
        quarantineCertNo: 'BJ-QC-2026-A001',
        veterinarian: '王医生',
        feedType: '玉米+豆粕,无激素',
        vaccineRecords: [
          { name: '禽流感疫苗', date: '2026-01-15' },
          { name: '新城疫疫苗', date: '2026-02-15' },
        ],
        status: 'active',
        remark: '180 天散养土鸡',
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    stat.archives += 1;
  }

  // 二维码批次 1(100 个 blank,前 2 个绑到 arch1)
  let batch1 = await batchRepo.findOne({ where: { name: 'DEMO-BATCH-001' } });
  if (!batch1) {
    batch1 = await batchRepo.save(
      batchRepo.create({
        name: 'DEMO-BATCH-001',
        totalCount: 10,
        generatedBy: null,
        createdAt: NOW,
      }),
    );
    const batchSeq = Number(batch1.batchId) % 46656;
    const rows: Partial<TraceabilityQrcode>[] = [];
    for (let i = 0; i < 10; i++) {
      const code = encodeQrcode(batchSeq, i);
      rows.push({
        code,
        archiveId: i < 2 ? arch1.archiveId : null,
        status: i < 2 ? 'bound' : 'blank',
        generatedBatchId: batch1.batchId,
        generatedAt: NOW,
        boundAt: i < 2 ? NOW : null,
      });
    }
    await qrRepo.insert(rows);
    stat.qrcodes += rows.length;
  }
}
