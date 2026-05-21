<script setup lang="ts">
/**
 * 多图上传组件 — admin-web 通用
 *
 *  - v-model: 双向绑定 fileId 数组
 *  - previews: 已存在的 URL 数组(用于编辑时初始化预览),与 modelValue 顺序一一对应
 *  - max: 最多张数,达到上限时隐藏「+」按钮
 *  - bizType: 后端 FileBizScopeMap 允许 ADMIN 上传的业务类型
 *  - 缩略图网格 + × 删除 + ← → 移位排序;不引入新 sortable 依赖
 */
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';

import { assertImageFile, uploadImage } from '@/utils/upload';

interface ImageItem {
  fileId: string;
  url: string;
}

const props = withDefaults(
  defineProps<{
    modelValue: string[];
    previews?: string[];
    max?: number;
    bizType: string;
    disabled?: boolean;
    tip?: string;
  }>(),
  { max: 10, disabled: false, previews: () => [] },
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const items = ref<ImageItem[]>([]);
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function syncFromProps(): void {
  const next: ImageItem[] = [];
  for (let i = 0; i < props.modelValue.length; i += 1) {
    const fileId = props.modelValue[i]!;
    const existing = items.value.find((x) => x.fileId === fileId);
    if (existing) {
      next.push(existing);
    } else {
      const previewUrl = props.previews?.[i] ?? '';
      next.push({ fileId, url: previewUrl });
    }
  }
  items.value = next;
}

watch(
  () => [props.modelValue, props.previews],
  () => syncFromProps(),
  { immediate: true, deep: true },
);

const canAdd = computed<boolean>(() => !props.disabled && items.value.length < props.max);
const slotsLeft = computed<number>(() => Math.max(0, props.max - items.value.length));

function triggerPick(): void {
  if (!canAdd.value) return;
  fileInput.value?.click();
}

async function onFilesChosen(ev: Event): Promise<void> {
  const target = ev.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  target.value = '';
  if (files.length === 0) return;

  const allowed = files.slice(0, slotsLeft.value);
  if (files.length > allowed.length) {
    ElMessage.warning(`最多 ${props.max} 张,已忽略多余的 ${files.length - allowed.length} 张`);
  }
  uploading.value = true;
  try {
    for (const f of allowed) {
      try {
        assertImageFile(f);
      } catch (e) {
        ElMessage.error((e as Error).message);
        continue;
      }
      try {
        const r = await uploadImage(f, props.bizType);
        items.value.push({ fileId: r.fileId, url: r.url });
      } catch (e) {
        ElMessage.error(`「${f.name}」上传失败:${(e as Error).message}`);
      }
    }
    emitChange();
  } finally {
    uploading.value = false;
  }
}

function emitChange(): void {
  emit(
    'update:modelValue',
    items.value.map((it) => it.fileId),
  );
}

function remove(idx: number): void {
  items.value.splice(idx, 1);
  emitChange();
}

function move(idx: number, dir: -1 | 1): void {
  const target = idx + dir;
  if (target < 0 || target >= items.value.length) return;
  const a = items.value[idx]!;
  const b = items.value[target]!;
  items.value[idx] = b;
  items.value[target] = a;
  emitChange();
}
</script>

<template>
  <div class="multi-image-upload">
    <div class="grid">
      <div v-for="(it, idx) in items" :key="it.fileId" class="cell">
        <img v-if="it.url" :src="it.url" alt="" class="thumb" />
        <div v-else class="thumb thumb--placeholder">图片</div>
        <div class="cell__hover">
          <button type="button" class="op op-move" :disabled="idx === 0" title="左移" @click="move(idx, -1)">‹</button>
          <button type="button" class="op op-del" title="删除" @click="remove(idx)">×</button>
          <button
            type="button"
            class="op op-move"
            :disabled="idx === items.length - 1"
            title="右移"
            @click="move(idx, 1)"
          >
            ›
          </button>
        </div>
        <div class="cell__order">{{ idx + 1 }}</div>
      </div>
      <button v-if="canAdd" type="button" class="cell cell--add" :disabled="uploading" @click="triggerPick">
        <span class="add__plus">+</span>
        <span class="add__hint">{{ uploading ? '上传中…' : `添加 (${items.length}/${max})` }}</span>
      </button>
    </div>
    <div v-if="tip" class="tip">{{ tip }}</div>
    <input ref="fileInput" type="file" accept="image/*" multiple style="display: none" @change="onFilesChosen" />
  </div>
</template>

<style scoped>
.multi-image-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
}
.cell {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-elevated, #f5f7fa);
  border: 1px solid var(--border, #dcdfe6);
}
.thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.thumb--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg-muted, #94a3b8);
  font-size: 12px;
  background: #f1f5f9;
}
.cell__hover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.55);
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}
.cell:hover .cell__hover {
  opacity: 1;
  pointer-events: auto;
}
.op {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
}
.op:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.op-del {
  background: #ef4444;
}
.op-del:hover {
  background: #dc2626;
}
.op-move:hover {
  background: rgba(255, 255, 255, 0.32);
}
.cell__order {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 0 6px;
  background: rgba(15, 23, 42, 0.65);
  color: #fff;
  border-radius: 999px;
  font-size: 11px;
  line-height: 18px;
}
.cell--add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #fff;
  border: 1px dashed #cbd5e1;
  color: #94a3b8;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}
.cell--add:hover {
  border-color: #2e9c5d;
  color: #2e9c5d;
}
.cell--add:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.add__plus {
  font-size: 28px;
  line-height: 1;
}
.add__hint {
  font-size: 11px;
}
.tip {
  font-size: 12px;
  color: var(--fg-muted, #94a3b8);
}
</style>
