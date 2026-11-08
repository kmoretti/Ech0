<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="widget-page">
    <header class="widget-masthead">
      <button
        type="button"
        class="widget-back"
        :aria-label="t('commonNav.backHome')"
        :title="t('commonNav.backHome')"
        @click="router.push('/')"
      >
        <Arrow class="widget-back__icon" />
      </button>

      <p class="widget-masthead__eyebrow">Ech0</p>
      <h1 class="widget-masthead__title">Widget</h1>
      <span class="widget-masthead__rule" aria-hidden="true"></span>
    </header>

    <div class="widget-stack">
      <TheHeatMap />
      <TheRecentCard v-if="AgentSetting.enable" />
      <TheConnectWidget />
      <TheCommentWidget />
    </div>
  </div>
</template>

<script setup lang="ts">
import Arrow from '@/components/icons/arrow.vue'
import {
  TheCommentWidget,
  TheConnectWidget,
  TheHeatMap,
  TheRecentCard,
} from '@/components/advanced/widget'
import { useSettingStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()
const settingStore = useSettingStore()
const { AgentSetting } = storeToRefs(settingStore)
</script>

<style scoped>
.widget-page {
  width: min(92vw, 24rem);
  margin: 0 auto;
  padding: 2.4rem 0 4rem;
}

.widget-masthead {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0 1.1rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-border-strong) 65%, transparent);
}

.widget-back {
  position: absolute;
  top: -0.2rem;
  left: -1.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.widget-back:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-subtle);
  transform: translateX(-2px);
}

.widget-back:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.widget-back__icon {
  width: 1.35rem;
  height: 1.35rem;
  transform: rotate(180deg);
}

.widget-masthead__eyebrow {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.widget-masthead__title {
  margin: 0.3rem 0 0;
  font-family: var(--font-family-display);
  font-size: clamp(2.1rem, 9vw, 2.8rem);
  font-style: italic;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--color-text-primary);
}

.widget-masthead__rule {
  width: 3rem;
  margin-top: 0.9rem;
  border-top: 1px solid color-mix(in srgb, var(--color-text-primary) 26%, transparent);
}

.widget-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.4rem;
}

@media (width <= 480px) {
  .widget-page {
    width: 100%;
    padding-inline: 0.75rem;
  }

  .widget-back {
    left: 0;
  }
}
</style>
