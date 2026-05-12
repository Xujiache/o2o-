<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { listReviews, replyReview, type ReviewFilter, type ReviewListItemVo } from '@/api/reviews';
import SvgIcon from '@/components/common/SvgIcon.vue';

const filter = ref<ReviewFilter>('all');
const ratingFilter = ref<number | null>(null);
const list = ref<ReviewListItemVo[]>([]);
const total = ref(0);
const unreplied = ref(0);
const avgRating = ref('0.00');
const loading = ref(false);
const pageNo = ref(1);
const pageSize = 20;

const FILTERS: Array<{ key: ReviewFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'unreplied', label: '未回复' },
  { key: 'replied', label: '已回复' },
];

const RATING_FILTERS: Array<{ value: number | null; label: string }> = [
  { value: null, label: '全部' },
  { value: 5, label: '5 星' },
  { value: 4, label: '4 星' },
  { value: 3, label: '3 星' },
  { value: 2, label: '2 星' },
  { value: 1, label: '1 星' },
];

async function load(): Promise<void> {
  loading.value = true;
  try {
    const r = await listReviews({
      filter: filter.value,
      rating: ratingFilter.value ?? undefined,
      pageNo: pageNo.value,
      pageSize,
    });
    if (r.code === '0' && r.data) {
      list.value = r.data.list;
      total.value = r.data.total;
      unreplied.value = r.data.unrepliedCount;
      avgRating.value = r.data.avgRating;
    }
  } finally {
    loading.value = false;
  }
}

function switchFilter(f: ReviewFilter): void {
  if (filter.value === f) return;
  filter.value = f;
  pageNo.value = 1;
  void load();
}

function switchRating(v: number | null): void {
  if (ratingFilter.value === v) return;
  ratingFilter.value = v;
  pageNo.value = 1;
  void load();
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}`;
}

function previewImage(images: string[], current: string): void {
  uni.previewImage({ urls: images, current });
}

const avgStars = computed<string[]>(() => {
  const v = Number(avgRating.value);
  return [1, 2, 3, 4, 5].map((i) => (v >= i - 0.25 ? 'full' : v >= i - 0.75 ? 'half' : 'empty'));
});

// ===== 回复抽屉 =====
const replyOpen = ref(false);
const replyTarget = ref<ReviewListItemVo | null>(null);
const replyContent = ref('');
const submitting = ref(false);

function openReply(item: ReviewListItemVo): void {
  replyTarget.value = item;
  replyContent.value = '';
  replyOpen.value = true;
}
function closeReply(): void {
  replyOpen.value = false;
  replyTarget.value = null;
  replyContent.value = '';
}

async function submitReply(): Promise<void> {
  const t = replyTarget.value;
  if (!t) return;
  const content = replyContent.value.trim();
  if (!content) {
    uni.showToast({ title: '请输入回复内容', icon: 'none' });
    return;
  }
  submitting.value = true;
  try {
    const r = await replyReview(t.orderReviewId, content);
    if (r.code !== '0') {
      uni.showToast({ title: r.message || '回复失败', icon: 'none' });
      return;
    }
    uni.showToast({ title: '已回复', icon: 'success' });
    closeReply();
    await load();
  } finally {
    submitting.value = false;
  }
}

const QUICK_REPLIES = [
  '感谢您的支持与好评!',
  '感谢反馈,我们已记录,会持续改进。',
  '抱歉给您带来不便,请联系客服我们尽快处理。',
];
function applyQuick(text: string): void {
  replyContent.value = text;
}

onMounted(load);
</script>

<template>
  <view class="rv">
    <!-- 顶部数据条 -->
    <view class="rv__hd">
      <view class="rv__hd-stat">
        <text class="rv__hd-val">{{ avgRating }}</text>
        <view class="rv__hd-stars">
          <SvgIcon
            v-for="(s, i) in avgStars"
            :key="i"
            name="star"
            :size="20"
            :color="s === 'empty' ? '#dde2ea' : '#f7971e'"
          />
        </view>
        <text class="rv__hd-label">平均评分</text>
      </view>
      <view class="rv__hd-divider" />
      <view class="rv__hd-stat">
        <text class="rv__hd-val">{{ total }}</text>
        <text class="rv__hd-label">评价总数</text>
      </view>
      <view class="rv__hd-divider" />
      <view class="rv__hd-stat">
        <text class="rv__hd-val rv__hd-val--warn">{{ unreplied }}</text>
        <text class="rv__hd-label">未回复</text>
      </view>
    </view>

    <!-- 主筛选 -->
    <view class="rv__filters">
      <view
        v-for="f in FILTERS"
        :key="f.key"
        class="rv__filter"
        :class="{ 'rv__filter--active': filter === f.key }"
        @tap="switchFilter(f.key)"
      >
        {{ f.label }}
        <text v-if="f.key === 'unreplied' && unreplied > 0" class="rv__filter-badge">{{ unreplied }}</text>
      </view>
    </view>

    <!-- 评分筛选(横向) -->
    <scroll-view scroll-x class="rv__rates" :show-scrollbar="false">
      <view class="rv__rates-inner">
        <view
          v-for="r in RATING_FILTERS"
          :key="r.label"
          class="rv__rate"
          :class="{ 'rv__rate--active': ratingFilter === r.value }"
          @tap="switchRating(r.value)"
          >{{ r.label }}</view
        >
      </view>
    </scroll-view>

    <view v-if="loading && list.length === 0" class="rv__msg">加载中…</view>
    <view v-else-if="list.length === 0" class="rv__empty">
      <SvgIcon name="star" :size="100" color="#dde2ea" />
      <text class="rv__empty-text">暂无符合条件的评价</text>
    </view>

    <!-- 评价卡片 -->
    <view v-else class="rv__list">
      <view v-for="r in list" :key="r.orderReviewId" class="rv__card">
        <!-- 头 -->
        <view class="rv__card-head">
          <view class="rv__card-user">
            <view class="rv__card-avatar">{{ r.customerLabel.slice(-2) }}</view>
            <view class="rv__card-meta">
              <text class="rv__card-name">{{ r.customerLabel }}</text>
              <text class="rv__card-time">{{ fmtTime(r.createdAt) }}</text>
            </view>
          </view>
          <view class="rv__card-rating">
            <SvgIcon v-for="i in 5" :key="i" name="star" :size="22" :color="r.rating >= i ? '#f7971e' : '#dde2ea'" />
          </view>
        </view>

        <!-- 内容 -->
        <text v-if="r.content" class="rv__card-content">{{ r.content }}</text>
        <text v-else class="rv__card-content rv__card-content--mute">该用户未填写评价文字</text>

        <!-- 图片 -->
        <view v-if="r.images.length > 0" class="rv__imgs">
          <image
            v-for="(img, i) in r.images"
            :key="i"
            :src="img"
            class="rv__img"
            mode="aspectFill"
            @tap="previewImage(r.images, img)"
          />
        </view>

        <!-- 订单关联 -->
        <view v-if="r.orderNo" class="rv__order">
          <SvgIcon name="clipboard" :size="20" color="#8a94a6" />
          <text class="rv__order-no">订单 {{ r.orderNo }}</text>
        </view>

        <!-- 已回复展示 -->
        <view v-if="r.reply" class="rv__reply">
          <view class="rv__reply-head">
            <SvgIcon name="check" :size="18" color="#11998e" />
            <text class="rv__reply-tag">商家回复</text>
            <text class="rv__reply-time">{{ fmtTime(r.reply.createdAt) }}</text>
          </view>
          <text class="rv__reply-content">{{ r.reply.content }}</text>
        </view>

        <!-- 未回复操作 -->
        <view v-else class="rv__act">
          <view class="rv__act-btn" @tap="openReply(r)">
            <SvgIcon name="file-edit" :size="22" color="#fff" />
            <text>回复评价</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 回复抽屉 -->
    <view v-if="replyOpen" class="rv-drawer">
      <view class="rv-drawer__mask" @tap="closeReply" />
      <view class="rv-drawer__panel">
        <view class="rv-drawer__head">
          <text class="rv-drawer__title">回复评价</text>
          <view class="rv-drawer__close" @tap="closeReply">
            <SvgIcon name="x" :size="28" color="#8a94a6" />
          </view>
        </view>
        <view v-if="replyTarget" class="rv-drawer__target">
          <view class="rv-drawer__target-row">
            <view class="rv-drawer__target-rating">
              <SvgIcon
                v-for="i in 5"
                :key="i"
                name="star"
                :size="18"
                :color="replyTarget.rating >= i ? '#f7971e' : '#dde2ea'"
              />
            </view>
            <text class="rv-drawer__target-user">{{ replyTarget.customerLabel }}</text>
          </view>
          <text v-if="replyTarget.content" class="rv-drawer__target-content">{{ replyTarget.content }}</text>
        </view>

        <textarea
          v-model="replyContent"
          class="rv-drawer__input"
          placeholder="请输入回复内容(最多 500 字),建议先表达感谢,再针对反馈说明改进"
          maxlength="500"
        />
        <text class="rv-drawer__count">{{ replyContent.length }} / 500</text>

        <view class="rv-drawer__quicks">
          <text class="rv-drawer__quicks-label">常用话术</text>
          <view class="rv-drawer__quicks-row">
            <view v-for="(q, i) in QUICK_REPLIES" :key="i" class="rv-drawer__quick" @tap="applyQuick(q)">{{ q }}</view>
          </view>
        </view>

        <view class="rv-drawer__btns">
          <view class="rv-drawer__btn rv-drawer__btn--ghost" @tap="closeReply">取消</view>
          <view
            class="rv-drawer__btn rv-drawer__btn--primary"
            :class="{ 'rv-drawer__btn--disabled': submitting || !replyContent.trim() }"
            @tap="submitReply"
            >{{ submitting ? '提交中…' : '提交回复' }}</view
          >
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.rv {
  min-height: 100vh;
  padding: 24rpx 24rpx 60rpx;
  background: #f5f6f8;
}

/* 顶部 stat 条 */
.rv__hd {
  display: flex;
  align-items: stretch;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 16rpx;
  box-shadow: 0 4rpx 14rpx rgba(31, 41, 55, 0.04);
}
.rv__hd-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}
.rv__hd-val {
  font-size: 38rpx;
  font-weight: 800;
  color: #172033;
  line-height: 1;
}
.rv__hd-val--warn {
  color: #ed6c02;
}
.rv__hd-label {
  font-size: 22rpx;
  color: #8a94a6;
}
.rv__hd-stars {
  display: flex;
  gap: 2rpx;
}
.rv__hd-divider {
  width: 1rpx;
  background: rgba(31, 41, 55, 0.06);
  margin: 6rpx 0;
}

/* 主筛选 pill */
.rv__filters {
  display: flex;
  gap: 12rpx;
  margin-top: 18rpx;
}
.rv__filter {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 24rpx;
  color: #5a6275;
  background: #fff;
  border-radius: 12rpx;
  position: relative;
}
.rv__filter--active {
  background: #172033;
  color: #fff;
  font-weight: 700;
}
.rv__filter-badge {
  position: absolute;
  top: -6rpx;
  right: 14rpx;
  background: #ed6c02;
  color: #fff;
  font-size: 18rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  font-weight: 700;
}

/* 评分筛选横向 */
.rv__rates {
  margin-top: 14rpx;
}
.rv__rates-inner {
  display: inline-flex;
  gap: 10rpx;
  padding-right: 24rpx;
}
.rv__rate {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #5a6275;
  background: #fff;
  flex-shrink: 0;
}
.rv__rate--active {
  background: rgba(247, 151, 30, 0.14);
  color: #b86b00;
  font-weight: 700;
}

/* 列表 */
.rv__list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 18rpx;
}
.rv__card {
  background: #fff;
  border-radius: 18rpx;
  padding: 24rpx 24rpx 20rpx;
  box-shadow: 0 4rpx 14rpx rgba(31, 41, 55, 0.04);
}
.rv__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.rv__card-user {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-width: 0;
  flex: 1;
}
.rv__card-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #c5c9d2, #94a0b0);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.rv__card-meta {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.rv__card-name {
  font-size: 26rpx;
  font-weight: 600;
  color: #172033;
}
.rv__card-time {
  font-size: 20rpx;
  color: #8a94a6;
}
.rv__card-rating {
  display: flex;
  gap: 2rpx;
  flex-shrink: 0;
}
.rv__card-content {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  color: #172033;
  line-height: 1.55;
}
.rv__card-content--mute {
  color: #b6bfcd;
}
.rv__imgs {
  margin-top: 14rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.rv__img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background: #f5f6f8;
}
.rv__order {
  margin-top: 14rpx;
  padding: 10rpx 14rpx;
  background: #f7f8fa;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.rv__order-no {
  font-size: 20rpx;
  color: #5a6275;
}

/* 已回复块 */
.rv__reply {
  margin-top: 14rpx;
  padding: 16rpx 18rpx;
  background: rgba(17, 153, 142, 0.08);
  border-left: 4rpx solid #11998e;
  border-radius: 0 12rpx 12rpx 0;
}
.rv__reply-head {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 6rpx;
}
.rv__reply-tag {
  font-size: 22rpx;
  font-weight: 700;
  color: #11998e;
}
.rv__reply-time {
  font-size: 20rpx;
  color: #8a94a6;
  margin-left: auto;
}
.rv__reply-content {
  font-size: 26rpx;
  color: #172033;
  line-height: 1.55;
}

/* 未回复操作 */
.rv__act {
  margin-top: 16rpx;
  display: flex;
  justify-content: flex-end;
}
.rv__act-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 28rpx;
  background: #b7791f;
  color: #fff;
  font-size: 24rpx;
  font-weight: 700;
  border-radius: 10rpx;
}

/* 抽屉 */
.rv-drawer {
  position: fixed;
  inset: 0;
  z-index: 100;
}
.rv-drawer__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
}
.rv-drawer__panel {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 24rpx 28rpx calc(env(safe-area-inset-bottom, 0rpx) + 24rpx);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
}
.rv-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid rgba(31, 41, 55, 0.06);
}
.rv-drawer__title {
  font-size: 32rpx;
  font-weight: 800;
  color: #172033;
}
.rv-drawer__close {
  padding: 8rpx;
}
.rv-drawer__target {
  margin-top: 16rpx;
  padding: 16rpx 18rpx;
  background: #f7f8fa;
  border-radius: 14rpx;
}
.rv-drawer__target-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}
.rv-drawer__target-rating {
  display: flex;
  gap: 2rpx;
}
.rv-drawer__target-user {
  font-size: 22rpx;
  color: #8a94a6;
}
.rv-drawer__target-content {
  font-size: 24rpx;
  color: #5a6275;
  line-height: 1.5;
}
.rv-drawer__input {
  margin-top: 16rpx;
  width: 100%;
  height: 220rpx;
  padding: 18rpx 20rpx;
  background: #f7f8fa;
  border-radius: 14rpx;
  font-size: 28rpx;
  color: #172033;
  box-sizing: border-box;
}
.rv-drawer__count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: #8a94a6;
  margin-top: 8rpx;
}
.rv-drawer__quicks {
  margin-top: 14rpx;
}
.rv-drawer__quicks-label {
  font-size: 22rpx;
  color: #8a94a6;
  display: block;
  margin-bottom: 8rpx;
}
.rv-drawer__quicks-row {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.rv-drawer__quick {
  padding: 12rpx 16rpx;
  background: rgba(183, 121, 31, 0.06);
  border: 1rpx dashed rgba(183, 121, 31, 0.32);
  border-radius: 10rpx;
  font-size: 24rpx;
  color: #5a6275;
}
.rv-drawer__btns {
  display: flex;
  gap: 12rpx;
  margin-top: 22rpx;
}
.rv-drawer__btn {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 12rpx;
  font-size: 28rpx;
  font-weight: 700;
}
.rv-drawer__btn--ghost {
  background: #f5f6f8;
  color: #5a6275;
}
.rv-drawer__btn--primary {
  background: #b7791f;
  color: #fff;
}
.rv-drawer__btn--disabled {
  background: #dde2ea;
  color: #b6bfcd;
}

/* 空 & 加载 */
.rv__msg {
  text-align: center;
  padding: 80rpx 0;
  color: #8a94a6;
  font-size: 24rpx;
}
.rv__empty {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
}
.rv__empty-text {
  font-size: 24rpx;
  color: #8a94a6;
}
</style>
