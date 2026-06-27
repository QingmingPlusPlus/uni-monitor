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
  --um-color-rail: #D8E1EB;
  --um-color-text-primary: #162033;
  --um-color-text-secondary: #566579;
  --um-color-text-inverse: #FFFFFF;
  --um-color-border: #D5DEE8;
  --um-color-accent: #126B72;
  --um-color-accent-soft: #DDEFF0;
  --um-color-success: #15905D;
  --um-color-warning: #B7791F;
  --um-color-danger: #C2413A;
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
