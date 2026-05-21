<script setup lang="ts">
/**
 * AI 食材顾问 — 流式对话页(云端同步 · 智能自动滚动 · DeepSeek logo)
 *
 * 滚动策略:
 *   - 默认跟随:AI 每次 delta 都把 anchor 滚到底
 *   - 用户主动上滑 → 暂停自动跟随 + 显示"跳到底部"浮按钮
 *   - 用户滑到接近底部(< 80px)→ 自动恢复跟随
 */
import { computed, nextTick, onUnmounted, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

import NavBar from '@/components/common/NavBar.vue';
import SvgIcon from '@/components/common/SvgIcon.vue';
import { archiveAiConversation, listAiMessages, resolveAiConversation, streamChat } from '@/api/ai-chat';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const userAvatarUrl = computed<string>(() => authStore.profile.avatarUrl || '');

const userInitial = computed<string>(() => {
  const name = (authStore.profile.nickname || '').trim();
  if (name) return name.slice(-1).toUpperCase();
  const m = (authStore.mobile || '').trim();
  if (m) return m.slice(-1);
  return '?';
});

const userAvatarGradient = computed<string>(() => {
  const palette = [
    'linear-gradient(135deg, #5fbe7d, #2e9c5d)',
    'linear-gradient(135deg, #4D6BFE, #1F4DDB)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ef4444, #b91c1c)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #0ea5e9, #0369a1)',
    'linear-gradient(135deg, #ec4899, #be185d)',
  ];
  const seed = (authStore.mobile || authStore.profile.nickname || 'guest') + '';
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length]!;
});

interface UiMessage {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

/** 极简 markdown → HTML(防 XSS 转义 + 块/行内元素) */
function renderMarkdown(raw: string): string {
  if (!raw) return '';
  const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = escaped.split('\n');
  const out: string[] = [];
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (/^###\s+/.test(trimmed)) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<h3>${trimmed.replace(/^###\s+/, '')}</h3>`);
    } else if (/^##\s+/.test(trimmed)) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<h2>${trimmed.replace(/^##\s+/, '')}</h2>`);
    } else if (/^#\s+/.test(trimmed)) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<h1>${trimmed.replace(/^#\s+/, '')}</h1>`);
    } else if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${trimmed.replace(/^[-*]\s+/, '')}</li>`);
    } else if (trimmed === '') {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push('');
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(trimmed);
    }
  }
  if (inList) out.push('</ul>');
  let html = out
    .join('\n')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br/>');
  return `<p>${html}</p>`;
}

const productId = ref<string | undefined>(undefined);
const productName = ref<string>('');
const conversationId = ref<string>('');
const input = ref<string>('');
const messages = ref<UiMessage[]>([]);
const sending = ref<boolean>(false);
const mode = ref<'mock' | 'real' | ''>('');
const abortFn = ref<(() => void) | null>(null);
const historyLoading = ref<boolean>(false);

/* ───── 智能滚动(原生 scrollIntoView + RAF 节流,ChatGPT/Claude 实际做法) ───── */
const userScrolledUp = ref<boolean>(false);
/** 距底部像素距离 — 用于跳到底部按钮显示判断 */
const distanceFromBottom = ref<number>(0);
let lastScrollTop = 0;
const NEAR_BOTTOM_THRESHOLD = 80;
let rafScheduled = false;

/** 用浏览器原生 API 把 messages 末尾的 marker 滚到视口底端 */
function doScrollNow(behavior: 'auto' | 'smooth' = 'auto'): void {
  if (typeof document === 'undefined') return;
  const marker = document.getElementById('chat-bottom-marker');
  if (marker && typeof marker.scrollIntoView === 'function') {
    try {
      marker.scrollIntoView({ block: 'end', inline: 'nearest', behavior });
      return;
    } catch {
      // 老浏览器 fallback
    }
  }
  // Fallback:找内部 scroll 容器直接设 scrollTop
  const outer = document.querySelector('.chat__list') as HTMLElement | null;
  if (!outer) return;
  const candidates: HTMLElement[] = [];
  outer.querySelectorAll('.uni-scroll-view').forEach((el) => candidates.push(el as HTMLElement));
  candidates.push(outer);
  const target = candidates.find((el) => el.scrollHeight > el.clientHeight + 1);
  if (target) target.scrollTop = target.scrollHeight + 9999;
}

/** 流式 delta 触发(RAF 节流) — 用户上滑后不打扰 */
function scheduleScrollToBottom(): void {
  if (userScrolledUp.value) return;
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    if (userScrolledUp.value) return;
    doScrollNow('auto');
  });
}

/** 强制滚到底(发新消息 / 跳到底部按钮 / 进入页面) — 双 RAF 等 DOM layout 完成 */
function forceScrollToBottom(behavior: 'auto' | 'smooth' = 'smooth'): void {
  userScrolledUp.value = false;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      doScrollNow(behavior);
      // 再补一次保险(content 可能还在 markdown 渲染中)
      setTimeout(() => doScrollNow(behavior), 80);
    });
  });
}

/** 跳到底部按钮:距底 > 200px 就显示,不依赖 userScrolledUp 状态(更直观) */
const showJumpToBottom = computed<boolean>(() => distanceFromBottom.value > 200);

const welcomeQuestions = ['推荐一道家常做法', '有哪些营养价值?', '适合搭配什么一起吃?', '怎么保存最久?'];

const placeholderText = computed(() =>
  productName.value ? `咨询「${productName.value}」的做法、营养、搭配...` : '问我任何关于食材的问题...',
);

const welcomeIntro = computed(() =>
  productName.value
    ? `你好!我是你的 AI 食材顾问。\n\n你正在咨询「${productName.value}」。我可以告诉你它的做法、营养价值、搭配建议、储存方法等。下方有一些常见问题,你也可以直接打字提问。`
    : `你好!我是你的 AI 食材顾问。\n\n问我任何关于食材的问题:做法、营养、搭配、储存...`,
);

onLoad(async (q?: Record<string, string | undefined>) => {
  productId.value = q?.productId;
  productName.value = q?.productName ? decodeURIComponent(q.productName) : '';
  await loadOrCreateConversation();
});

onUnmounted(() => {
  abortFn.value?.();
});

async function loadOrCreateConversation(): Promise<void> {
  historyLoading.value = true;
  try {
    const r = await resolveAiConversation(productId.value, productName.value || undefined);
    if (r.code !== '0' || !r.data) {
      messages.value = [{ role: 'assistant', content: welcomeIntro.value }];
      return;
    }
    conversationId.value = r.data.conversationId;
    const h = await listAiMessages(conversationId.value);
    if (h.code === '0' && h.data && h.data.list.length > 0) {
      messages.value = h.data.list.map((m) => ({ role: m.role, content: m.content }));
    } else {
      messages.value = [{ role: 'assistant', content: welcomeIntro.value }];
    }
    forceScrollToBottom();
  } finally {
    historyLoading.value = false;
  }
}

function pickQuick(q: string): void {
  if (sending.value) return;
  input.value = q;
  void send();
}

async function send(): Promise<void> {
  const text = input.value.trim();
  if (!text || sending.value) return;
  input.value = '';

  messages.value.push({ role: 'user', content: text });
  messages.value.push({ role: 'assistant', content: '', streaming: true });
  const aiIdx = messages.value.length - 1;
  sending.value = true;
  // 用户发起新提问 → 强制重置 + 跟随
  userScrolledUp.value = false;
  forceScrollToBottom();

  abortFn.value = streamChat(
    {
      conversationId: conversationId.value || undefined,
      productId: productId.value,
      productName: productName.value || undefined,
      message: text,
    },
    {
      onConversation: (id) => {
        if (id && !conversationId.value) conversationId.value = id;
      },
      onMode: (m) => {
        mode.value = m;
      },
      onDelta: (delta) => {
        const m = messages.value[aiIdx];
        if (!m) return;
        m.content += delta;
        scheduleScrollToBottom();
      },
      onDone: () => {
        const m = messages.value[aiIdx];
        if (m) m.streaming = false;
        sending.value = false;
        abortFn.value = null;
        scheduleScrollToBottom();
      },
      onError: (msg) => {
        const m = messages.value[aiIdx];
        if (m) {
          m.content = m.content || `[错误] ${msg}`;
          m.streaming = false;
        }
        sending.value = false;
        abortFn.value = null;
      },
    },
  );
}

function stopGenerating(): void {
  abortFn.value?.();
  abortFn.value = null;
  sending.value = false;
  const last = messages.value[messages.value.length - 1];
  if (last && last.streaming) {
    last.streaming = false;
    if (!last.content) last.content = '(已停止)';
  }
}

async function startNewConversation(): Promise<void> {
  if (sending.value) return;
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '开启新对话?',
      content: '当前对话会保存到云端历史(随时可以继续),并新建一个空白对话。\n要继续吗?',
      confirmText: '新对话',
      cancelText: '取消',
      success: (m) => resolve(Boolean(m.confirm)),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return;

  const oldId = conversationId.value;
  abortFn.value?.();
  abortFn.value = null;
  conversationId.value = '';
  mode.value = '';
  messages.value = [{ role: 'assistant', content: welcomeIntro.value }];
  userScrolledUp.value = false;

  if (oldId) {
    try {
      await archiveAiConversation(oldId);
    } catch {
      /* ignore */
    }
  }
  const r = await resolveAiConversation(productId.value, productName.value || undefined);
  if (r.code === '0' && r.data) conversationId.value = r.data.conversationId;
}

function jumpToBottom(): void {
  forceScrollToBottom('smooth');
}

/** 监听滚动:更新 distance + 用户上滑检测 */
function onScroll(e: { detail: { scrollTop: number; scrollHeight: number } }): void {
  const { scrollTop, scrollHeight } = e.detail;
  // 从 scroll-view 实际 scroller 拿 viewport,fallback 估算
  let viewport = 600;
  if (typeof document !== 'undefined') {
    const outer = document.querySelector('.chat__list') as HTMLElement | null;
    if (outer) {
      const inner = outer.querySelector('.uni-scroll-view') as HTMLElement | null;
      viewport = (inner ?? outer).clientHeight || viewport;
    }
  }
  const d = Math.max(0, scrollHeight - scrollTop - viewport);
  distanceFromBottom.value = d;
  if (d < NEAR_BOTTOM_THRESHOLD) {
    userScrolledUp.value = false;
  } else if (scrollTop < lastScrollTop - 4) {
    userScrolledUp.value = true;
  }
  lastScrollTop = scrollTop;
}
</script>

<template>
  <view class="chat">
    <NavBar title="AI 食材顾问" mode="solid">
      <view class="chat__newconv" @click="startNewConversation">
        <SvgIcon name="plus" :size="28" />
        <text class="chat__newconv-label">新对话</text>
      </view>
    </NavBar>

    <view v-if="mode" class="chat__badge" :class="mode === 'real' ? 'chat__badge--real' : 'chat__badge--mock'">
      <SvgIcon name="sparkles" :size="22" />
      <text>{{ mode === 'real' ? 'DeepSeek 实时 · 云端同步' : 'Mock 演示(管理员配置 API Key 后启用真实 AI)' }}</text>
    </view>

    <view v-if="historyLoading" class="chat__loading">
      <SvgIcon name="refresh" :size="32" />
      <text>同步历史中...</text>
    </view>

    <scroll-view scroll-y class="chat__list" enable-flex @scroll="onScroll" @scrolltolower="userScrolledUp = false">
      <view
        v-for="(m, i) in messages"
        :key="i"
        class="chat__row"
        :class="m.role === 'user' ? 'chat__row--user' : 'chat__row--ai'"
      >
        <!-- AI:精致 DeepSeek logo -->
        <view v-if="m.role === 'assistant'" class="chat__avatar chat__avatar--ai">
          <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" class="chat__ds-logo">
            <defs>
              <linearGradient id="ds-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#5B7BFF" />
                <stop offset="55%" stop-color="#4D6BFE" />
                <stop offset="100%" stop-color="#1F4DDB" />
              </linearGradient>
              <linearGradient id="ds-whale" x1="20%" y1="0%" x2="80%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#E8EEFF" />
              </linearGradient>
              <radialGradient id="ds-glow" cx="30%" cy="25%" r="60%">
                <stop offset="0%" stop-color="rgba(255,255,255,0.45)" />
                <stop offset="100%" stop-color="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            <rect width="40" height="40" rx="11" fill="url(#ds-bg)" />
            <rect width="40" height="40" rx="11" fill="url(#ds-glow)" />
            <!-- 抽象鲸鱼/海豚:圆滑大弧 + 尾鳍 -->
            <path
              d="M9 22 C 9 14, 17 11, 23 13 C 28 14.5, 32 17.5, 33 22 C 33 24, 31 25.5, 28 25 L 14 23 C 11 22.7, 9 22.5, 9 22 Z"
              fill="url(#ds-whale)"
            />
            <!-- 尾鳍 -->
            <path d="M30 19 C 33 17, 35 18, 36 21 C 34 22, 32 21.5, 30 20 Z" fill="url(#ds-whale)" />
            <!-- 眼睛 -->
            <circle cx="26" cy="18" r="1.6" fill="#1F4DDB" />
            <circle cx="26.4" cy="17.6" r="0.5" fill="#ffffff" />
          </svg>
        </view>

        <view class="chat__bubble" :class="m.role === 'user' ? 'chat__bubble--user' : 'chat__bubble--ai'">
          <view v-if="m.role === 'assistant' && m.content" class="chat__md" v-html="renderMarkdown(m.content)" />
          <text v-else-if="m.role === 'user'" class="chat__text">{{ m.content }}</text>
          <!-- 等待首字符:三点波浪 + 标签 -->
          <view v-if="m.streaming && !m.content" class="chat__thinking">
            <view class="chat__thinking-dot" />
            <view class="chat__thinking-dot" />
            <view class="chat__thinking-dot" />
            <text class="chat__thinking-label">思考中</text>
          </view>
          <!-- 输出过程中:末尾呼吸圆点(代替原斜杠) -->
          <view v-else-if="m.streaming" class="chat__pulse" />
        </view>

        <!-- User:头像在右,优先 avatarUrl,fallback 渐变+首字 -->
        <view
          v-if="m.role === 'user'"
          class="chat__avatar chat__avatar--user"
          :style="userAvatarUrl ? undefined : `background: ${userAvatarGradient}`"
        >
          <image v-if="userAvatarUrl" :src="userAvatarUrl" class="chat__avatar-img" mode="aspectFill" />
          <text v-else class="chat__avatar-initial">{{ userInitial }}</text>
        </view>
      </view>

      <view v-if="messages.length === 1 && messages[0].role === 'assistant'" class="chat__quicks">
        <view v-for="q in welcomeQuestions" :key="q" class="chat__quick" @click="pickQuick(q)">
          <SvgIcon name="zap" :size="24" />
          <text>{{ q }}</text>
        </view>
      </view>

      <!-- Marker:scrollIntoView 目标 -->
      <view id="chat-bottom-marker" class="chat__bottom-marker" />
    </scroll-view>

    <!-- 跳到底部浮按钮 — 直接按距离判断,只要不在底部就出现 -->
    <view v-if="showJumpToBottom" class="chat__jump" @click="jumpToBottom">
      <SvgIcon name="chevrons-down" :size="32" color="#fff" />
      <text class="chat__jump-badge">{{ Math.min(99, Math.ceil(distanceFromBottom / 100)) }}</text>
    </view>

    <view class="chat__input-bar">
      <view class="chat__input-wrap">
        <input
          v-model="input"
          class="chat__input"
          :placeholder="placeholderText"
          confirm-type="send"
          :disabled="sending"
          @confirm="send"
        />
      </view>
      <view v-if="sending" class="chat__send chat__send--stop" @click="stopGenerating">
        <SvgIcon name="square" :size="28" color="#fff" />
      </view>
      <view v-else class="chat__send" :class="{ 'chat__send--disabled': !input.trim() }" @click="send">
        <SvgIcon name="send" :size="28" color="#fff" :stroke-width="2" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.chat {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}

/* ───── 顶栏右侧 + 新对话 ───── */
.chat__newconv {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: var(--brand-primary-glow);
  color: var(--brand-primary-dark);
}
.chat__newconv:active {
  background: var(--brand-primary-light);
  color: #fff;
}
.chat__newconv-label {
  font-size: 22rpx;
  font-weight: 700;
}

/* ───── 模式 badge ───── */
.chat__badge {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin: 12rpx 24rpx 0;
  padding: 12rpx 20rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
}
.chat__badge--real {
  background: var(--brand-primary-glow);
  color: var(--brand-primary-dark);
}
.chat__badge--mock {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
}

.chat__loading {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  font-size: 24rpx;
  color: var(--text-muted);
}

/* ───── 消息列表 ───── */
.chat__list {
  flex: 1;
  padding: 24rpx 24rpx 220rpx;
  box-sizing: border-box;
}
.chat__row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 32rpx;
  gap: 16rpx;
}
.chat__row--user {
  justify-content: flex-end;
}
.chat__bottom-marker {
  height: 1rpx;
  width: 100%;
  scroll-margin-bottom: 16rpx;
}

/* ───── 头像 ───── */
.chat__avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}
.chat__avatar--ai {
  background: transparent;
  box-shadow: 0 10rpx 28rpx rgba(77, 107, 254, 0.32);
}
.chat__ds-logo {
  width: 100%;
  height: 100%;
}
.chat__avatar--user {
  border-radius: 999rpx;
  box-shadow: 0 6rpx 16rpx rgba(23, 32, 51, 0.18);
}
.chat__avatar-img {
  width: 100%;
  height: 100%;
  display: block;
}
.chat__avatar-initial {
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
}

/* ───── 气泡 ───── */
.chat__bubble {
  max-width: 76%;
  padding: 24rpx 28rpx;
  border-radius: 28rpx;
  font-size: 28rpx;
  line-height: 1.75;
  word-break: break-word;
  position: relative;
}
.chat__bubble--ai {
  background: var(--bg-card);
  color: var(--text-primary);
  border-top-left-radius: 10rpx;
  box-shadow:
    0 10rpx 32rpx rgba(23, 32, 51, 0.06),
    0 2rpx 8rpx rgba(23, 32, 51, 0.04);
}
.chat__bubble--user {
  background: var(--brand-gradient);
  color: #fff;
  border-top-right-radius: 10rpx;
  white-space: pre-wrap;
  box-shadow: 0 10rpx 24rpx var(--brand-primary-glow);
}
.chat__text {
  display: block;
}

/* ───── AI markdown 排版 ───── */
.chat__md :deep(p) {
  margin: 0;
}
.chat__md :deep(p + p) {
  margin-top: 14rpx;
}
.chat__md :deep(h1),
.chat__md :deep(h2),
.chat__md :deep(h3) {
  margin: 18rpx 0 8rpx;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.4;
}
.chat__md :deep(h1) {
  font-size: 34rpx;
}
.chat__md :deep(h2) {
  font-size: 32rpx;
}
.chat__md :deep(h3) {
  font-size: 30rpx;
  color: var(--brand-primary-dark);
}
.chat__md :deep(strong) {
  font-weight: 800;
  color: var(--brand-primary-dark);
}
.chat__md :deep(code) {
  font-family: 'Menlo', 'Consolas', monospace;
  font-size: 24rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: var(--brand-primary-glow);
  color: var(--brand-primary-dark);
}
.chat__md :deep(ul) {
  margin: 8rpx 0;
  padding-left: 0;
  list-style: none;
}
.chat__md :deep(li) {
  position: relative;
  padding-left: 28rpx;
  margin: 6rpx 0;
}
.chat__md :deep(li::before) {
  content: '';
  position: absolute;
  left: 4rpx;
  top: 16rpx;
  width: 12rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: var(--brand-gradient);
}

/* ───── 思考动画:等首字符 ───── */
.chat__thinking {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 4rpx 4rpx 4rpx 2rpx;
  animation: chat-thinking-in 0.25s ease-out;
}
.chat__thinking-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 999rpx;
  background: var(--brand-gradient);
  animation: chat-thinking-bounce 1.3s ease-in-out infinite;
  box-shadow: 0 2rpx 6rpx var(--brand-primary-glow);
}
.chat__thinking-dot:nth-child(1) {
  animation-delay: 0s;
}
.chat__thinking-dot:nth-child(2) {
  animation-delay: 0.18s;
}
.chat__thinking-dot:nth-child(3) {
  animation-delay: 0.36s;
}
.chat__thinking-label {
  margin-left: 8rpx;
  font-size: 22rpx;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 1rpx;
  animation: chat-label-shimmer 2s ease-in-out infinite;
}
@keyframes chat-thinking-bounce {
  0%,
  70%,
  100% {
    transform: translateY(0) scale(0.8);
    opacity: 0.45;
  }
  35% {
    transform: translateY(-10rpx) scale(1.05);
    opacity: 1;
  }
}
@keyframes chat-thinking-in {
  from {
    opacity: 0;
    transform: translateX(-4rpx);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes chat-label-shimmer {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* ───── 输出中:末尾呼吸圆点(替换原斜杠) ───── */
.chat__pulse {
  display: inline-block;
  width: 14rpx;
  height: 14rpx;
  margin-left: 6rpx;
  border-radius: 999rpx;
  background: var(--brand-gradient);
  vertical-align: middle;
  animation: chat-pulse 1.1s ease-in-out infinite;
  box-shadow: 0 2rpx 8rpx var(--brand-primary-glow);
}
@keyframes chat-pulse {
  0%,
  100% {
    transform: scale(0.7);
    opacity: 0.5;
    box-shadow: 0 0 0 0 var(--brand-primary-glow);
  }
  50% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 0 8rpx rgba(46, 156, 93, 0);
  }
}

/* ───── 快捷问题(欢迎语下方) ───── */
.chat__quicks {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 12rpx 88rpx 0;
}
.chat__quick {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 24rpx;
  border-radius: 999rpx;
  background: var(--bg-card);
  font-size: 24rpx;
  color: var(--brand-primary);
  border: 1rpx solid var(--brand-primary-light);
}
.chat__quick:active {
  background: var(--brand-primary-glow);
}

/* ───── 跳到底部浮按钮(右下 · 内含距离 badge) ───── */
.chat__jump {
  position: fixed;
  right: 32rpx;
  bottom: 200rpx;
  width: 84rpx;
  height: 84rpx;
  border-radius: 999rpx;
  background: var(--brand-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 14rpx 32rpx var(--brand-primary-glow),
    0 4rpx 12rpx rgba(23, 32, 51, 0.15),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.3);
  z-index: 60;
  animation: chat-jump-in 0.25s ease-out;
}
.chat__jump:active {
  transform: scale(0.92);
}
.chat__jump-badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: var(--price-color);
  color: #fff;
  font-size: 20rpx;
  font-weight: 800;
  line-height: 36rpx;
  text-align: center;
  border: 2rpx solid #fff;
  box-sizing: border-box;
}
@keyframes chat-jump-in {
  from {
    opacity: 0;
    transform: translateY(20rpx) scale(0.7);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ───── 输入栏 ───── */
.chat__input-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx calc(env(safe-area-inset-bottom) + 20rpx);
  background: var(--bg-card);
  border-top: 1rpx solid var(--bg-divider);
  box-shadow: 0 -12rpx 32rpx rgba(23, 32, 51, 0.08);
}
.chat__input-wrap {
  flex: 1;
  padding: 4rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, var(--brand-primary-glow), rgba(46, 156, 93, 0.04));
}
.chat__input {
  width: 100%;
  height: 80rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: var(--bg-soft);
  font-size: 28rpx;
  color: var(--text-primary);
  box-sizing: border-box;
}

/* ───── 发送按钮(重构 · 加大 · 内光 + 外光晕) ───── */
.chat__send {
  width: 88rpx;
  height: 88rpx;
  border-radius: 28rpx;
  background: var(--brand-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 12rpx 28rpx var(--brand-primary-glow),
    0 2rpx 6rpx rgba(46, 156, 93, 0.25),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.32);
  position: relative;
  overflow: hidden;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.chat__send::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0) 60%);
  pointer-events: none;
}
.chat__send:active {
  transform: scale(0.92);
  box-shadow:
    0 6rpx 14rpx var(--brand-primary-glow),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.2);
}
.chat__send--disabled {
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
  box-shadow: none;
}
.chat__send--disabled::before {
  display: none;
}
.chat__send--stop {
  background: linear-gradient(135deg, #ef4444, #b91c1c);
  box-shadow:
    0 12rpx 24rpx rgba(239, 68, 68, 0.35),
    inset 0 2rpx 0 rgba(255, 255, 255, 0.25);
}
</style>
