<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app';

onLaunch(() => {
  console.info('[customer-app] launched');
});

onShow(() => {
  console.info('[customer-app] show');
});
</script>

<style>
/* 永久隐藏 uni-app H5 原生 tabBar — 三端统一用 FloatTabBar 浮岛取代 */
uni-tabbar,
.uni-tabbar {
  display: none !important;
}

page {
  min-height: 100%;
  background:
    radial-gradient(circle at 18% 0%, rgba(255, 107, 53, 0.18), transparent 34%),
    linear-gradient(180deg, #fff7ed 0%, #f6f8fb 36%, #eef2f7 100%);
  color: #172033;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

button {
  border-radius: 999rpx;
  box-shadow: 0 16rpx 36rpx rgba(255, 107, 53, 0.16);
}

button::after {
  border: none;
}

.launch,
.login,
.home,
.orders,
.page,
.me {
  box-sizing: border-box;
}

.launch,
.login,
.page {
  min-height: 100vh;
}

.page {
  justify-content: center;
  padding: 96rpx 40rpx !important;
  text-align: center;
}

.page__icon {
  width: 132rpx;
  height: 132rpx;
  line-height: 132rpx;
  border-radius: 42rpx;
  background: #fff;
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.1);
}

.page__title {
  font-weight: 800 !important;
  color: #172033;
}

.page__btn {
  border-radius: 999rpx !important;
  background: linear-gradient(135deg, #ff7a45, #ffb020) !important;
  font-weight: 700;
}

.card,
.home__cat,
.home__store,
.orders__tabs,
.orders__row,
.me__menu,
.me__entries {
  border: 1rpx solid rgba(23, 32, 51, 0.06);
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
</style>
