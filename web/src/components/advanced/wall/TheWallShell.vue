<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="wall-page">
    <span class="wall-page__light" aria-hidden="true"></span>
    <span class="wall-page__grain" aria-hidden="true"></span>

    <div class="wall-shell">
      <main class="wall-main">
        <slot name="main"></slot>
      </main>
      <div class="wall-side">
        <slot name="side"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.wall-page {
  --wall-paper: #f4ede0;
  --wall-ink: #2e2720;

  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  color: var(--wall-ink);
  background-color: #e7dfd2;
  background-image:
    radial-gradient(120% 80% at 12% 0%, rgb(255 253 246 / 55%), transparent 58%),
    radial-gradient(90% 70% at 92% 100%, rgb(150 122 88 / 12%), transparent 62%),
    repeating-linear-gradient(
      0deg,
      rgb(112 85 55 / 8%) 0 1px,
      transparent 1px 13px,
      rgb(255 255 255 / 20%) 13px 14px,
      transparent 14px 29px
    ),
    repeating-linear-gradient(0deg, rgb(118 92 62 / 3%) 0 1px, transparent 1px 37px),
    linear-gradient(180deg, #eee7db 0%, #e7dfd2 52%, #dfd6c6 100%);
  background-attachment: fixed;
}

.wall-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-image:
    radial-gradient(ellipse 15rem 3.6rem at 17% 22%, rgb(120 92 60 / 10%), transparent 64%),
    radial-gradient(ellipse 9rem 2.2rem at 74% 61%, rgb(120 92 60 / 8%), transparent 64%),
    radial-gradient(ellipse 12rem 2.8rem at 43% 88%, rgb(120 92 60 / 7%), transparent 66%);
}

.wall-page::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  box-shadow: inset 0 0 20rem rgb(92 70 45 / 14%);
}

.wall-page__light {
  position: absolute;
  inset: -10% -5% auto -10%;
  z-index: 0;
  height: 70%;
  pointer-events: none;
  background: radial-gradient(60% 60% at 40% 20%, rgb(255 253 248 / 34%), transparent 70%);
  filter: blur(8px);
}

.wall-page__grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.055;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
  mix-blend-mode: soft-light;
}

.wall-shell {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  gap: clamp(1rem, 2.4vw, 1.8rem);
  width: 100%;
  max-width: 108rem;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: 1.05rem 1.2rem 1.2rem;
}

.wall-main {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.wall-side {
  flex: 0 0 19.5rem;
  width: 19.5rem;
  min-height: 0;
  padding-left: clamp(0.2rem, 1vw, 0.6rem);
  border-left: 1px solid rgb(96 74 48 / 10%);
  background: linear-gradient(90deg, transparent, rgb(128 100 66 / 7%));
}

@media (width <= 1079px) {
  .wall-page {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }

  .wall-shell {
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.7rem 0.7rem 1.6rem;
  }

  .wall-side {
    flex: 0 0 auto;
    order: -1;
    width: 100%;
    min-height: 0;
    padding-left: 0;
    border-left: 0;
    background: none;
  }

  .wall-main {
    min-height: 62vh;
  }
}
</style>

<style>
html.wall-mode,
html.wall-mode body {
  overflow: hidden;
  scrollbar-width: none;
}

html.wall-mode ::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

@media (width <= 1079px) {
  html.wall-mode,
  html.wall-mode body {
    overflow: hidden auto;
  }
}
</style>
