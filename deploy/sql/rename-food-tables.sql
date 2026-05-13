-- =====================================================================
-- 外卖旧表归档脚本（生鲜商城上线后手动执行）
-- 执行前提：
--   1. 所有进行中外卖订单已 T-7 强制退款 / 完结
--   2. 公告已发布，客户端已升级至包含 grocery 模块的版本
--   3. 路由层 c/food/* 已返回 410 Gone
-- =====================================================================

-- forward: 归档外卖核心表（保留 90 天，便于回滚）
RENAME TABLE
  `food_order` TO `food_order_deprecated_20260513`,
  `food_order_item` TO `food_order_item_deprecated_20260513`;

-- 注意：以下表为外卖/生鲜共用，不重命名
--   product / product_sku / product_category / cart_item / store / payment_order /
--   order_review / coupon_rule / user_coupon / order_price_snapshot
-- 这些表新增了 product_type='food'/'grocery' 等区分字段；外卖路由下线后不再产生 food 数据写入。

-- =====================================================================
-- rollback（90 天内紧急回滚用）：
--   RENAME TABLE
--     `food_order_deprecated_20260513` TO `food_order`,
--     `food_order_item_deprecated_20260513` TO `food_order_item`;
-- =====================================================================

-- =====================================================================
-- 终极清理（90 天后 DBA 执行；先 dump 到 OSS 冷库）：
--   mysqldump ... food_order_deprecated_20260513 food_order_item_deprecated_20260513 > food_archive_20260513.sql
--   aws s3 cp food_archive_20260513.sql s3://o2o-cold-archive/
--   DROP TABLE `food_order_deprecated_20260513`;
--   DROP TABLE `food_order_item_deprecated_20260513`;
-- =====================================================================
