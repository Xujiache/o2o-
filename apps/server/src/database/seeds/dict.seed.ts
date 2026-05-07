import { In, Not, type DataSource } from 'typeorm';

import { SysDict } from '../entities';

interface DictRow {
  dictType: string;
  code: string;
  label: string;
  sort?: number;
  remark?: string | null;
}

const NOW = Date.now().toString();

/** 外卖订单状态(来源:全局状态机与业务规则.md) */
const TAKEAWAY_STATUS: DictRow[] = [
  { dictType: 'order_takeaway_status', code: 'WAIT_PAY', label: '待支付', sort: 10 },
  { dictType: 'order_takeaway_status', code: 'PAID_WAIT_MERCHANT', label: '已支付,等待商家接单', sort: 20 },
  { dictType: 'order_takeaway_status', code: 'MERCHANT_ACCEPTED', label: '商家已接单', sort: 30 },
  { dictType: 'order_takeaway_status', code: 'PREPARING', label: '制作中', sort: 40 },
  { dictType: 'order_takeaway_status', code: 'READY_FOR_PICKUP', label: '待取餐', sort: 50 },
  { dictType: 'order_takeaway_status', code: 'RIDER_ASSIGNED', label: '骑手已分配', sort: 60 },
  { dictType: 'order_takeaway_status', code: 'PICKED_UP', label: '已取餐', sort: 70 },
  { dictType: 'order_takeaway_status', code: 'DELIVERING', label: '配送中', sort: 80 },
  { dictType: 'order_takeaway_status', code: 'DELIVERED', label: '已送达', sort: 90 },
  { dictType: 'order_takeaway_status', code: 'COMPLETED', label: '已完成', sort: 100 },
  { dictType: 'order_takeaway_status', code: 'CANCELLED', label: '已取消', sort: 200 },
  { dictType: 'order_takeaway_status', code: 'REFUNDING', label: '退款中', sort: 210 },
  { dictType: 'order_takeaway_status', code: 'REFUNDED', label: '已退款', sort: 220 },
  { dictType: 'order_takeaway_status', code: 'AFTER_SALE', label: '售后中', sort: 230 },
];

/** 跑腿订单状态(以 errand_order.status 为准;加价/退款等是事件或支付状态,不混入订单状态) */
const ERRAND_STATUS: DictRow[] = [
  { dictType: 'order_errand_status', code: 'WAIT_PAY', label: '待支付', sort: 10 },
  { dictType: 'order_errand_status', code: 'PAID', label: '已支付', sort: 20 },
  { dictType: 'order_errand_status', code: 'DISPATCHING', label: '派单中', sort: 30 },
  { dictType: 'order_errand_status', code: 'ASSIGNED', label: '骑手已接单', sort: 40 },
  { dictType: 'order_errand_status', code: 'PICKED_UP', label: '已取件', sort: 50 },
  { dictType: 'order_errand_status', code: 'DELIVERED', label: '已送达', sort: 60 },
  { dictType: 'order_errand_status', code: 'COMPLETED', label: '已完成', sort: 70 },
  { dictType: 'order_errand_status', code: 'CANCELLED', label: '已取消', sort: 200 },
];

/** 城市种子(remark 字段存省份) */
const CITIES: DictRow[] = [
  { dictType: 'city', code: '110100', label: '北京市', remark: '北京市', sort: 10 },
  { dictType: 'city', code: '310100', label: '上海市', remark: '上海市', sort: 20 },
  { dictType: 'city', code: '440100', label: '广州市', remark: '广东省', sort: 30 },
];

/** 文件业务类型 */
const FILE_BIZ: DictRow[] = [
  { dictType: 'file_biz_type', code: 'avatar', label: '头像', sort: 10 },
  { dictType: 'file_biz_type', code: 'user-realname', label: '用户实名', sort: 20 },
  { dictType: 'file_biz_type', code: 'merchant-license', label: '商家营业执照', sort: 30 },
  { dictType: 'file_biz_type', code: 'merchant-legal', label: '商家法人证件', sort: 40 },
  { dictType: 'file_biz_type', code: 'rider-realname', label: '骑手实名', sort: 50 },
  { dictType: 'file_biz_type', code: 'rider-health', label: '骑手健康证', sort: 60 },
  { dictType: 'file_biz_type', code: 'goods-image', label: '商品图', sort: 70 },
  { dictType: 'file_biz_type', code: 'after-sale-proof', label: '售后凭证', sort: 80 },
  { dictType: 'file_biz_type', code: 'errand-photo', label: '跑腿物品照片', sort: 90 },
];

/** 第三方提供商 */
const THIRD_PARTY: DictRow[] = [
  { dictType: 'third_party_provider', code: 'amap', label: '高德地图', sort: 10 },
  { dictType: 'third_party_provider', code: 'wxpay', label: '微信支付', sort: 20 },
  { dictType: 'third_party_provider', code: 'alipay', label: '支付宝', sort: 30 },
  { dictType: 'third_party_provider', code: 'getui', label: '个推', sort: 40 },
  { dictType: 'third_party_provider', code: 'ali-sms', label: '阿里云短信', sort: 50 },
  { dictType: 'third_party_provider', code: 'ali-realname', label: '阿里云实名认证', sort: 60 },
  { dictType: 'third_party_provider', code: 'minio', label: 'MinIO 对象存储', sort: 70 },
];

/** 操作主体类型 */
const OPERATOR_TYPE: DictRow[] = [
  { dictType: 'operator_type', code: 'customer', label: '用户', sort: 10 },
  { dictType: 'operator_type', code: 'merchant', label: '商家', sort: 20 },
  { dictType: 'operator_type', code: 'rider', label: '骑手', sort: 30 },
  { dictType: 'operator_type', code: 'admin', label: '平台管理员', sort: 40 },
  { dictType: 'operator_type', code: 'system', label: '系统', sort: 50 },
];

const ALL_DICTS: DictRow[] = [
  ...TAKEAWAY_STATUS,
  ...ERRAND_STATUS,
  ...CITIES,
  ...FILE_BIZ,
  ...THIRD_PARTY,
  ...OPERATOR_TYPE,
];

export async function seedDicts(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(SysDict);
  let count = 0;
  await repo.delete({
    dictType: 'order_errand_status',
    code: Not(In(ERRAND_STATUS.map((row) => row.code))),
  });
  for (const row of ALL_DICTS) {
    const existing = await repo.findOne({ where: { dictType: row.dictType, code: row.code } });
    if (existing) {
      existing.label = row.label;
      existing.sort = row.sort ?? 0;
      existing.remark = row.remark ?? null;
      existing.updatedAt = NOW;
      await repo.save(existing);
    } else {
      await repo.insert({
        dictType: row.dictType,
        code: row.code,
        label: row.label,
        sort: row.sort ?? 0,
        enabled: 1,
        remark: row.remark ?? null,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
    count++;
  }
  return count;
}
