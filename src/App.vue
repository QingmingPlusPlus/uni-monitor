<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";

onLaunch(() => {
  console.log("App Launch");
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style>
page,
body,
#app {
  --um-color-page: #F2F5F8;
  --um-color-surface: #FFFFFF;
  --um-color-surface-subtle: #E7EEF6;
  --um-color-rail: #D8E2EE;
  --um-color-text-primary: #162033;
  --um-color-text-secondary: #53657A;
  --um-color-text-inverse: #FFFFFF;
  --um-color-border: #D5DEE8;
  --um-color-accent: #2471FF;
  --um-color-accent-soft: #E7F0FF;
  --um-color-operation: #2471FF;
  --um-color-operation-soft: #E7F0FF;
  --um-color-success: #22A06B;
  --um-color-success-soft: #E6F6EE;
  --um-color-warning: #F5B638;
  --um-color-warning-soft: #FFF4D8;
  --um-color-danger: #E55353;
  --um-color-danger-soft: #FDE7E7;
  --um-color-changeover: #B7791F;
  --um-color-changeover-soft: #FFF4D8;
  --um-color-cleaning: #2471FF;
  --um-color-cleaning-soft: #E7F0FF;
  --space-1: 8rpx;
  --space-2: 16rpx;
  --space-3: 24rpx;
  --space-4: 32rpx;
  --space-5: 40rpx;
  --space-6: 48rpx;
  min-height: 100%;
  margin: 0;
  background: var(--um-color-page);
  color: var(--um-color-text-primary);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

@media (min-width: 768px) {
  page,
  body,
  #app {
    --space-1: 8px;
    --space-2: 12px;
    --space-3: 16px;
    --space-4: 20px;
    --space-5: 24px;
    --space-6: 32px;
  }
}
</style>
