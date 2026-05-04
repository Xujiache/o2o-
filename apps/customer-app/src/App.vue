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
page {
  background-color: #f5f5f5;
}
</style>
