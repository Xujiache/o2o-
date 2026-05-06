/**
 * 演示数据种子(stage 11 真上线前删除或改为环境开关).
 *
 * 用途:客户预览时一键塞入可用数据,免得 4 端打开后看到一片空白.
 * 幂等:每条按业务唯一字段(mobile / name)反查,存在则跳过,不修改已有数据.
 *
 * 包含:
 *   1 测试用户(13900000001,已实名,默认地址=北京天安门附近)
 *   2 商家(13900020001 老王炸鸡 / 13900020002 美味食堂),状态 active,店铺 online,各 3 商品
 *   1 骑手(13900030001),状态 active,在线,位置=北京中心
 */
import type { DataSource } from 'typeorm';

import {
  CustomerAddress,
  CustomerProfile,
  CustomerUser,
  MerchantAccount,
  MessageSetting,
  Product,
  ProductCategory,
  RiderAccount,
  RiderApplication,
  RiderStatus,
  Store,
} from '../entities';

const NOW = Date.now().toString();

interface DemoStat {
  customers: number;
  merchants: number;
  stores: number;
  products: number;
  riders: number;
}

export async function seedDemoData(ds: DataSource): Promise<DemoStat> {
  const stat: DemoStat = { customers: 0, merchants: 0, stores: 0, products: 0, riders: 0 };

  await seedCustomer(ds, stat);
  await seedMerchantWithStoreAndProducts(
    ds,
    {
      mobile: '13900020001',
      storeName: '老王炸鸡(演示)',
      intro: '正宗炸鸡 30 分钟送达',
      categoryName: '招牌',
      products: [
        { name: '香酥大鸡腿', priceCents: 1980, originalCents: 2580, desc: '外酥里嫩,招牌爆款' },
        { name: '黑椒鸡块汉堡', priceCents: 2680, originalCents: 2980, desc: '现做现卖' },
        { name: '可乐(中)', priceCents: 600, originalCents: null, desc: '冰镇' },
      ],
    },
    stat,
  );
  await seedMerchantWithStoreAndProducts(
    ds,
    {
      mobile: '13900020002',
      storeName: '美味食堂(演示)',
      intro: '家常菜 现炒现做',
      categoryName: '热菜',
      products: [
        { name: '宫保鸡丁套餐', priceCents: 2580, originalCents: 2880, desc: '配米饭+汤' },
        { name: '番茄炒蛋盖饭', priceCents: 1880, originalCents: null, desc: '清淡好吃' },
        { name: '紫菜蛋花汤', priceCents: 480, originalCents: null, desc: '暖胃' },
      ],
    },
    stat,
  );
  await seedRider(ds, stat);

  return stat;
}

// ---------- customer ----------
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

  // 默认地址(天安门附近)
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

// ---------- merchant + store + products ----------
interface MerchantSeedInput {
  mobile: string;
  storeName: string;
  intro: string;
  categoryName: string;
  products: Array<{ name: string; priceCents: number; originalCents: number | null; desc: string }>;
}

async function seedMerchantWithStoreAndProducts(
  ds: DataSource,
  input: MerchantSeedInput,
  stat: DemoStat,
): Promise<void> {
  const acctRepo = ds.getRepository(MerchantAccount);
  const storeRepo = ds.getRepository(Store);
  const catRepo = ds.getRepository(ProductCategory);
  const productRepo = ds.getRepository(Product);

  let acct = await acctRepo.findOne({ where: { mobile: input.mobile } });
  if (!acct) {
    acct = await acctRepo.save(
      acctRepo.create({
        mobile: input.mobile,
        accountStatus: 'active',
        latestApplicationId: null,
        approvedStoreId: null,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    stat.merchants += 1;
  }

  let store = await storeRepo.findOne({ where: { merchantId: acct.merchantId } });
  if (!store) {
    store = await storeRepo.save(
      storeRepo.create({
        merchantId: acct.merchantId,
        name: input.storeName,
        avatarFileId: null,
        intro: input.intro,
        businessScope: '中式快餐',
        businessStatus: 'online',
        minOrderAmount: '1000', // ¥10
        deliveryFee: '300', // ¥3
        commissionRate: '0.0500',
        notice: '欢迎光临,30 分钟必达',
        cityCode: 'BJ',
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
    // 写回 merchant_account.approved_store_id
    await acctRepo.update(acct.merchantId, { approvedStoreId: store.storeId, updatedAt: NOW });
    stat.stores += 1;
  }

  let cat = await catRepo.findOne({ where: { storeId: store.storeId, name: input.categoryName } });
  if (!cat) {
    cat = await catRepo.save(
      catRepo.create({
        storeId: store.storeId,
        name: input.categoryName,
        displayOrder: 1,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
  }

  for (const p of input.products) {
    const existing = await productRepo.findOne({ where: { storeId: store.storeId, name: p.name } });
    if (existing) continue;
    await productRepo.insert({
      storeId: store.storeId,
      categoryId: cat.categoryId,
      name: p.name,
      description: p.desc,
      coverImageFileId: null,
      images: null,
      price: String(p.priceCents),
      originalPrice: p.originalCents !== null ? String(p.originalCents) : null,
      stock: 100,
      stockAlertThreshold: 5,
      hasSku: 0,
      saleStatus: 'on_shelf',
      createdAt: NOW,
      updatedAt: NOW,
    });
    stat.products += 1;
  }
}

// ---------- rider ----------
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

  // 补一条已 approved 的 application,让 hasApplication=true,登录后 progress 页能识别为已审核
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
    // 回写 rider_account.approved_application_id
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
}
