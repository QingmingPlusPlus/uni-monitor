<script setup lang="ts">
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import type { CssMapDisplayOptions } from './css3dMapTypes'

const props = defineProps<{
  open: boolean
  options: CssMapDisplayOptions
}>()

const emit = defineEmits<{
  close: []
  updateOptions: [value: CssMapDisplayOptions]
}>()

const { t } = useI18n()

const settings = computed(() => [
  {
    key: 'showStatusColor' as const,
    label: t('threeMap.config.showStatusColor'),
  },
  {
    key: 'showLoadRateColor' as const,
    label: t('threeMap.config.showLoadRateColor'),
  },
  {
    key: 'showStaffing' as const,
    label: t('threeMap.config.showStaffing'),
  },
  {
    key: 'showFiveMChanges' as const,
    label: t('threeMap.config.showFiveM'),
  },
])

function toggle(key: keyof CssMapDisplayOptions) {
  emit('updateOptions', {
    ...props.options,
    [key]: !props.options[key],
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="css-map-settings"
      data-css-map-control="true"
      @click.self="emit('close')"
      @pointerdown.stop
      @wheel.stop
    >
      <section
        class="css-map-settings__dialog"
        role="dialog"
        aria-modal="true"
      >
        <header class="css-map-settings__header">
          <h2>{{ t('threeMap.config.title') }}</h2>
          <button
            class="css-map-settings__close"
            type="button"
            :title="t('threeMap.config.close')"
            @click="emit('close')"
          >
            <el-icon :size="30">
              <Close />
            </el-icon>
          </button>
        </header>

        <div class="css-map-settings__body">
          <button
            v-for="item in settings"
            :key="item.key"
            class="css-map-settings__row"
            type="button"
            @click="toggle(item.key)"
          >
            <span>{{ item.label }}</span>
            <span
              class="css-map-settings__switch"
              :class="{ 'css-map-settings__switch--on': options[item.key] }"
              role="switch"
              :aria-checked="options[item.key]"
            >
              <span />
            </span>
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.css-map-settings {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.52);
}

.css-map-settings__dialog {
  width: min(680px, calc(100vw - 32px));
  padding: 38px 44px 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.24);
  color: #14213d;
}

.css-map-settings__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.css-map-settings__header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0;
}

.css-map-settings__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #1677ff;
  cursor: pointer;
}

.css-map-settings__close:hover {
  background: rgba(22, 119, 255, 0.08);
}

.css-map-settings__body {
  display: grid;
  gap: 16px;
}

.css-map-settings__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 82px;
  padding: 0 20px;
  border: 1px solid rgba(100, 116, 139, 0.2);
  border-radius: 6px;
  background: rgba(248, 250, 252, 0.76);
  color: #14213d;
  cursor: pointer;
}

.css-map-settings__row > span:first-child {
  overflow-wrap: anywhere;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0;
  text-align: left;
}

.css-map-settings__switch {
  position: relative;
  width: 70px;
  height: 36px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.5);
  flex: 0 0 auto;
  transition: background 160ms ease;
}

.css-map-settings__switch span {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.22);
  transition: transform 160ms ease;
}

.css-map-settings__switch--on {
  background: #1677ff;
}

.css-map-settings__switch--on span {
  transform: translateX(34px);
}

@media (max-width: 720px) {
  .css-map-settings__dialog {
    padding: 28px 20px 24px;
  }

  .css-map-settings__header h2 {
    font-size: 24px;
  }

  .css-map-settings__row > span:first-child {
    font-size: 18px;
  }
}
</style>
