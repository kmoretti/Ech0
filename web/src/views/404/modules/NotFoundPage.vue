<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="notfound-page">
    <div class="notfound-sheet">
      <span class="notfound-sheet__tape" aria-hidden="true"></span>

      <p class="notfound-code" aria-hidden="true">404</p>
      <p class="notfound-text">{{ t('notFound.pageNotFound') }}</p>
      <span class="notfound-rule" aria-hidden="true"></span>

      <button type="button" class="notfound-back" @click="$router.push({ name: 'home' })">
        <Arrow class="notfound-back__icon" />
        <span>{{ t('commonNav.backHome') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import Arrow from '@/components/icons/arrow.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.notfound-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 1.5rem 1rem;
}

.notfound-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(90vw, 21rem);
  padding: 3.2rem 1.6rem 1.5rem;
  background-color: color-mix(in srgb, var(--color-bg-surface) 94%, transparent);
  border: 1px solid var(--color-border-subtle);
  border-radius: 2px 14px 2px 2px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-text-primary) 4%, transparent),
    0 26px 42px -36px color-mix(in srgb, var(--color-text-primary) 55%, transparent);
  transform: rotate(-0.6deg);
  animation: notfound-settle 720ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.notfound-sheet::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.notfound-sheet__tape {
  position: absolute;
  top: -0.6rem;
  left: 50%;
  width: 4.6rem;
  height: 1.1rem;
  transform: translateX(-50%) rotate(1.4deg);
  background: color-mix(in srgb, var(--color-bg-surface) 60%, var(--color-border-subtle) 40%);
  opacity: 0.8;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--color-text-primary) 10%, transparent);
  pointer-events: none;
}

.notfound-code {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: clamp(3.6rem, 14vw, 4.6rem);
  font-style: italic;
  font-weight: 600;
  line-height: 0.9;
  letter-spacing: 0.06em;
  color: var(--color-text-primary);
}

.notfound-text {
  margin: 0.7rem 0 0;
  font-family: var(--font-family-display);
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-align: center;
  color: var(--color-text-muted);
}

.notfound-rule {
  width: 42%;
  margin: 1.15rem 0 1rem;
  border-top: 1px dashed color-mix(in srgb, var(--color-border-strong) 70%, transparent);
}

.notfound-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid transparent;
  border-radius: 2px;
  font-family: var(--font-family-display);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.notfound-back:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border-subtle);
  background: color-mix(in srgb, var(--color-bg-muted) 70%, transparent);
}

.notfound-back:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.notfound-back__icon {
  width: 1.05rem;
  height: 1.05rem;
  transform: rotate(180deg);
}

@keyframes notfound-settle {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: rotate(1.2deg) translateY(10px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: rotate(-0.6deg) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .notfound-sheet {
    animation: none;
  }
}
</style>
