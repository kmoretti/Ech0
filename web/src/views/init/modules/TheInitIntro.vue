<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <section class="init-intro">
    <p class="init-intro__kicker">{{ t('init.introKicker') }}</p>
    <h1 class="init-intro__name">Ech0</h1>
    <h2 class="init-intro__heading">{{ t('init.introHeading') }}</h2>
    <p class="init-intro__desc">{{ t('init.introDescription') }}</p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.init-intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-border-strong) 60%, transparent);
  text-align: center;
}

.init-intro__kicker {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.init-intro__name {
  margin: 0.35rem 0 0.3rem;
  font-family: var(--font-family-display);
  font-size: 2.6rem;
  font-style: italic;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--color-text-primary);
}

.init-intro__heading {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
}

.init-intro__desc {
  max-width: 17rem;
  margin: 0.35rem 0 0;
  font-size: 0.72rem;
  line-height: 1.65;
  color: var(--color-text-muted);
}
</style>
