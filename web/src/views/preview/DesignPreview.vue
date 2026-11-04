<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="preview-page">
    <div class="preview-shell">
      <header class="preview-head">
        <div class="preview-brand">
          <span class="preview-brand__mark" aria-hidden="true">提</span>
          <div>
            <p class="preview-brand__title">提笔摘星</p>
            <p class="preview-brand__sub">Star Letters · Design Preview</p>
          </div>
        </div>
        <span class="preview-head__badge"> 演示数据 · {{ demoEchoes.length }} 枚星笺 </span>
      </header>

      <div class="preview-layout">
        <main class="preview-main">
          <HomeBanner />
          <TheEchos :demo-echoes="demoEchoes" compact />
        </main>

        <aside class="preview-aside">
          <div class="preview-aside__card">
            <p class="preview-aside__eyebrow">设计笔记</p>
            <ul class="preview-aside__list">
              <li><span>01</span>每日星语，随日期轮换</li>
              <li><span>02</span>按日成星座，节点是当日的笺</li>
              <li><span>03</span>纸笺折角、墨迹晕染的入场</li>
              <li><span>04</span>首笺首字放大，如手抄本</li>
            </ul>
            <p class="preview-aside__note">
              这是一页只存在于开发环境的预览路由，正式页面仍从接口读取真实动态。
            </p>
          </div>
          <p class="preview-aside__verse">星汉灿烂<br />若出其里</p>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import HomeBanner from '@/views/home/modules/HomeBanner.vue'
import TheEchos from '@/views/home/modules/TheEchos.vue'
import { demoEchoes } from './demoEchoes'
</script>

<style scoped>
:global(.vue-devtools__anchor),
:global(.vue-devtools-frame) {
  display: none !important;
}

.preview-page {
  --home-canvas: var(--color-bg-canvas, #f5f3ef);
  --sj-canvas: #f7f3ea;
  --sj-paper: #fffdf7;
  --sj-ink: #2f251d;
  --sj-ink-2: #6f6357;
  --sj-ink-3: #9a8d7e;
  --sj-line: #e6ddcf;
  --sj-line-strong: #d5c7b4;
  --sj-accent: #b84200;
  --sj-gold: #b08a3e;

  min-height: 100dvh;
  padding: 1.6rem 0.9rem 4rem;
  background:
    radial-gradient(
      58rem 34rem at 50% -10%,
      color-mix(in srgb, var(--sj-gold) 7%, transparent),
      transparent 62%
    ),
    radial-gradient(
      circle at 1px 1px,
      color-mix(in srgb, var(--sj-ink) 3.2%, transparent) 1px,
      transparent 0
    ),
    var(--home-canvas);
  background-size:
    auto,
    20px 20px,
    auto;
  color: var(--color-text-primary);
}

.dark .preview-page {
  --sj-canvas: #171412;
  --sj-paper: #201b17;
  --sj-ink: #efe6d8;
  --sj-ink-2: #b9ab99;
  --sj-ink-3: #8a7c6b;
  --sj-line: #352c24;
  --sj-line-strong: #4b3e32;
  --sj-accent: #e07a3a;
  --sj-gold: #d0a95f;
}

.preview-shell {
  width: 100%;
  max-width: 59rem;
  margin: 0 auto;
}

.preview-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  margin-bottom: 1.2rem;
  padding: 0 0.25rem;
}

.preview-brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.preview-brand__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid color-mix(in srgb, var(--sj-accent) 60%, transparent);
  border-radius: 2px;
  color: var(--sj-accent);
  font-family: var(--font-family-display);
  font-size: 1.05rem;
  font-weight: 600;
  transform: rotate(-2deg);
}

.preview-brand__title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: var(--sj-ink);
}

.preview-brand__sub {
  margin: 0.08rem 0 0;
  font-family: var(--font-family-display);
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sj-ink-3);
}

.preview-head__badge {
  padding: 0.26rem 0.6rem;
  border: 1px dashed color-mix(in srgb, var(--sj-line-strong) 85%, transparent);
  border-radius: 2px;
  font-family: var(--font-family-display);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  color: var(--sj-ink-3);
}

.preview-layout {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 2.2rem;
}

.preview-main {
  width: 100%;
  max-width: 33rem;
  min-width: 0;
}

.preview-aside {
  width: 13rem;
  flex: none;
  padding-top: 1.4rem;
}

.preview-aside__card {
  padding: 0.9rem 0.95rem;
  border: 1px solid var(--sj-line);
  border-radius: 2px 12px 2px 2px;
  background: color-mix(in srgb, var(--sj-paper) 88%, transparent);
}

.preview-aside__eyebrow {
  margin: 0 0 0.55rem;
  font-family: var(--font-family-display);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  color: var(--sj-ink-3);
}

.preview-aside__list {
  display: flex;
  flex-direction: column;
  gap: 0.48rem;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.72rem;
  line-height: 1.55;
  color: var(--sj-ink-2);
}

.preview-aside__list li > span {
  margin-right: 0.4rem;
  font-family: var(--font-family-display);
  font-size: 0.62rem;
  color: var(--sj-gold);
}

.preview-aside__note {
  margin: 0.8rem 0 0;
  padding-top: 0.6rem;
  border-top: 1px dashed color-mix(in srgb, var(--sj-line-strong) 60%, transparent);
  font-size: 0.66rem;
  line-height: 1.6;
  color: var(--sj-ink-3);
}

.preview-aside__verse {
  margin: 2rem 0 0;
  padding-left: 0.9rem;
  border-left: 1px solid color-mix(in srgb, var(--sj-gold) 35%, transparent);
  font-family: var(--font-family-display);
  font-size: 0.82rem;
  line-height: 1.9;
  letter-spacing: 0.28em;
  color: color-mix(in srgb, var(--sj-ink-3) 80%, transparent);
}

@media (width <= 899.98px) {
  .preview-aside {
    display: none;
  }
}

@media (width <= 480px) {
  .preview-page {
    padding: 1.1rem 0.55rem 3rem;
  }

  .preview-head {
    margin-bottom: 0.9rem;
  }
}
</style>
