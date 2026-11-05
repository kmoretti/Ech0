<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div
    class="panel-card"
    :class="{
      'panel-card--dashed': borderStyle === 'dashed',
      'panel-card--solid': borderStyle === 'solid',
    }"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    borderStyle?: 'dashed' | 'solid'
  }>(),
  {
    borderStyle: 'dashed',
  },
)
</script>

<style scoped>
.panel-card {
  position: relative;
  padding: 1rem;
  overflow: auto;
  color: var(--color-text-primary);
  background-color: color-mix(in srgb, var(--color-bg-surface) 88%, transparent);
  border: 1px solid var(--color-border-subtle);
  border-radius: 2px 10px 2px 2px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-text-primary) 3.5%, transparent),
    0 16px 26px -28px color-mix(in srgb, var(--color-text-primary) 45%, transparent);
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease;
}

.panel-card--dashed {
  border-style: dashed;
}

.panel-card--solid {
  border-style: solid;
}

.panel-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 0.72rem;
  height: 0.72rem;
  pointer-events: none;
  opacity: 0.65;
  background: linear-gradient(
    225deg,
    var(--color-bg-canvas) 47%,
    color-mix(in srgb, var(--color-border-subtle) 80%, transparent) 50%,
    transparent 52%
  );
}

.panel-card:hover {
  border-color: color-mix(in srgb, var(--color-border-strong) 70%, transparent);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-text-primary) 3.5%, transparent),
    0 20px 32px -30px color-mix(in srgb, var(--color-text-primary) 52%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .panel-card {
    transition: none;
  }
}
</style>
