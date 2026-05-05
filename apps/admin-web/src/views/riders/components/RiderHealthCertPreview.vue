<script setup lang="ts">
import type { RiderCertificateFileVo } from '@/api/admin-riders';

interface Props {
  certificates: RiderCertificateFileVo[];
}
defineProps<Props>();

const labelMap: Record<string, string> = {
  id_card_front: '身份证(人像面)',
  id_card_back: '身份证(国徽面)',
  face_video: '人脸视频/照片',
  health_cert: '健康证',
  driver_license: '驾驶证',
  vehicle_license: '行驶证',
};
</script>

<template>
  <div class="cert-preview">
    <div v-for="c in certificates" :key="c.fileId" class="cert-preview__item">
      <div class="cert-preview__label">{{ labelMap[c.certType] || c.certType }}</div>
      <div v-if="c.url">
        <img v-if="!c.url.toLowerCase().endsWith('.pdf')" :src="c.url" class="cert-preview__img" />
        <embed v-else :src="c.url" type="application/pdf" class="cert-preview__pdf" />
      </div>
      <div v-else class="cert-preview__missing">(文件 url 缺失)</div>
    </div>
  </div>
</template>

<style scoped>
.cert-preview {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}
.cert-preview__item {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 8px;
}
.cert-preview__label {
  font-size: 12px;
  color: #888;
  margin-bottom: 6px;
}
.cert-preview__img {
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}
.cert-preview__pdf {
  width: 100%;
  height: 200px;
}
.cert-preview__missing {
  color: #ff4d4f;
  font-size: 12px;
}
</style>
