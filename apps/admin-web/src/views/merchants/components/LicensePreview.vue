<script setup lang="ts">
import type { LicenseFileVo } from '@/api/admin-merchants';

interface Props {
  licenses: LicenseFileVo[];
}
defineProps<Props>();

const labelMap: Record<string, string> = {
  business_license: '营业执照',
  food_permit: '食品许可证',
  legal_id_card_front: '法人身份证(正面)',
  legal_id_card_back: '法人身份证(背面)',
  store_photo: '门店实拍图',
};
</script>

<template>
  <div class="license-preview">
    <div v-for="l in licenses" :key="l.fileId" class="license-preview__item">
      <div class="license-preview__label">{{ labelMap[l.licenseType] || l.licenseType }}</div>
      <div v-if="l.url">
        <img v-if="!l.url.toLowerCase().endsWith('.pdf')" :src="l.url" class="license-preview__img" />
        <embed v-else :src="l.url" type="application/pdf" class="license-preview__pdf" />
      </div>
      <div v-else class="license-preview__missing">(文件 url 缺失)</div>
    </div>
  </div>
</template>

<style scoped>
.license-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.license-preview__item {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 8px;
}
.license-preview__label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}
.license-preview__img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}
.license-preview__pdf {
  width: 100%;
  height: 200px;
}
.license-preview__missing {
  color: #ff4d4f;
  font-size: 12px;
}
</style>
