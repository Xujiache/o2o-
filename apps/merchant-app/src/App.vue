<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';

onLaunch(() => {
  console.info('[merchant-app] launched');
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
    radial-gradient(circle at 80% 0%, rgba(46, 156, 93, 0.18), transparent 34%),
    linear-gradient(180deg, #e8f5ee 0%, #f7f8fb 40%, #eef2f7 100%);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

button {
  border-radius: 999rpx;
  box-shadow: 0 16rpx 36rpx rgba(46, 156, 93, 0.14);
}

button::after {
  border: none;
}

.launch,
.login,
.workbench,
.pending,
.plist,
.stat,
.me,
.apply,
.page {
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
  color: var(--text-primary);
}

.page__btn {
  border-radius: 999rpx !important;
  background: var(--brand-gradient) !important;
  font-weight: 700;
}

.card,
.workbench__header,
.workbench__menu,
.pending__card,
.plist__item,
.stat__cell,
.stat__top,
.me__header,
.me__menu {
  border: 1rpx solid rgba(23, 32, 51, 0.06);
  box-shadow: 0 18rpx 48rpx rgba(31, 41, 55, 0.08);
}
</style>
