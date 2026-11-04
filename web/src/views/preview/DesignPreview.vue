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
        <div class="preview-head__actions">
          <div class="preview-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="view === 'notes'"
              :class="{ 'is-active': view === 'notes' }"
              @click="view = 'notes'"
            >
              便笺
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="view === 'objects'"
              :class="{ 'is-active': view === 'objects' }"
              @click="view = 'objects'"
            >
              桌角物件
            </button>
          </div>
          <span class="preview-head__badge">
            {{ view === 'notes' ? `${demoEchoes.length} 枚便笺` : '4 件小物' }}
          </span>
        </div>
      </header>

      <div class="preview-layout">
        <main class="preview-main">
          <template v-if="view === 'notes'">
            <HomeBanner />
            <TheEchos :demo-echoes="demoEchoes" compact />
          </template>

          <section v-else class="object-shelf">
            <div class="object-shelf__intro">
              <p class="object-shelf__eyebrow">Desk Objects</p>
              <h2 class="object-shelf__title">桌角的小物件</h2>
              <p class="object-shelf__desc">
                这些不是说说，而是“状态”页签里的日常卡片。它们与便笺共用纸色、墨色和阴影。
              </p>
            </div>
            <div class="object-shelf__grid">
              <div class="object-shelf__item object-shelf__item--a">
                <TheHeatMap :demo-data="demoHeatmap" />
              </div>
              <div class="object-shelf__item object-shelf__item--b">
                <TheRecentCard :demo-text="demoRecent" />
              </div>
              <div class="object-shelf__item object-shelf__item--c">
                <TheConnectWidget :demo-connects="demoConnects" />
              </div>
              <div class="object-shelf__item object-shelf__item--d">
                <TheCommentWidget :demo-comment="demoComment" />
              </div>
            </div>
          </section>
        </main>

        <aside class="preview-aside">
          <div class="preview-aside__card">
            <p class="preview-aside__eyebrow">设计笔记</p>
            <ul class="preview-aside__list">
              <li><span>01</span>纸、胶带、图钉与钉书针</li>
              <li><span>02</span>双栏错落，按日成组</li>
              <li><span>03</span>便笺微倾，悬停时被拾起</li>
              <li><span>04</span>长笺横跨两栏，首字下沉</li>
              <li><span>05</span>颜色只留纸色、墨色与一点砖红</li>
              <li><span>06</span>链接、GitHub、地点是纸上的小物件</li>
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
import { ref } from 'vue'
import HomeBanner from '@/views/home/modules/HomeBanner.vue'
import TheEchos from '@/views/home/modules/TheEchos.vue'
import {
  TheCommentWidget,
  TheConnectWidget,
  TheHeatMap,
  TheRecentCard,
} from '@/components/advanced/widget'
import { demoEchoes } from './demoEchoes'

const view = ref<'notes' | 'objects'>('notes')

const heatCounts = [
  0, 1, 0, 2, 3, 1, 0, 4, 2, 1, 0, 0, 3, 2, 1, 5, 2, 0, 1, 3, 4, 2, 1, 0, 2, 3, 1, 4, 2, 0,
]
const demoHeatmap: App.Api.Ech0.HeatMap = Array.from({ length: 30 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (29 - index))
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return {
    date: `${date.getFullYear()}-${month}-${day}`,
    count: heatCounts[index] ?? 0,
  }
})

const demoRecent =
  '最近在整理旧书与秋天的手稿，写得不多，但每一篇都像在给日子做注脚。夜里读书的时间变长了，白天则常常出门散步。'

const demoConnects: App.Api.Connect.Connect[] = [
  '山月记',
  '拾光',
  '南窗',
  '苔痕',
  '晚风',
  '纸飞机',
].map((name, index) => ({
  server_name: name,
  server_url: '#',
  logo: '/favicon.ico',
  total_echos: 40 + index * 17,
  today_echos: index % 4,
  sys_username: '星野',
  version: '5.9.3',
}))

const demoComment: App.Api.Comment.CommentItem = {
  id: 'preview-comment-1',
  echo_id: 'demo-01',
  nickname: '阿遥',
  email: '',
  content: '读到银杏叶那一段，忽然也想翻翻旧书。',
  status: 'approved',
  hot: true,
  source: 'guest',
  created_at: Date.now(),
  updated_at: Date.now(),
}
</script>

<style scoped>
:global(.vue-devtools__anchor),
:global(.vue-devtools-frame) {
  display: none !important;
}

.preview-page {
  --home-canvas: #ece9e3;
  --sj-canvas: #ece9e3;
  --sj-paper: #fbfaf7;
  --sj-paper-2: #f5f2ec;
  --sj-kraft: #e7e1d7;
  --sj-ink: #292622;
  --sj-ink-2: #605b55;
  --sj-ink-3: #928c84;
  --sj-line: #d9d3ca;
  --sj-line-strong: #c3bcb2;
  --sj-accent: #8a4132;

  min-height: 100dvh;
  padding: 1.6rem 0.9rem 4rem;
  background:
    radial-gradient(90rem 50rem at 50% -18%, rgb(255 255 255 / 42%), transparent 62%),
    radial-gradient(
      circle at 1px 1px,
      color-mix(in srgb, var(--sj-ink) 3.5%, transparent) 1px,
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
  --home-canvas: #191715;
  --sj-canvas: #191715;
  --sj-paper: #23201d;
  --sj-paper-2: #201d1a;
  --sj-kraft: #2b2621;
  --sj-ink: #e9e4dc;
  --sj-ink-2: #b8b1a8;
  --sj-ink-3: #8d867d;
  --sj-line: #3a352f;
  --sj-line-strong: #4e4841;
  --sj-accent: #a85c49;
}

.preview-shell {
  width: 100%;
  max-width: 64rem;
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
  border: 1px solid var(--sj-line-strong);
  border-radius: 2px;
  color: var(--sj-ink);
  font-family: var(--font-family-display);
  font-size: 1.05rem;
  font-weight: 600;
  transform: rotate(-1.2deg);
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

.preview-head__actions {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.preview-tabs {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem;
  border: 1px solid var(--sj-line);
  border-radius: 2px;
  background: color-mix(in srgb, var(--sj-paper) 62%, transparent);
}

.preview-tabs button {
  padding: 0.24rem 0.6rem;
  font-family: var(--font-family-display);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  color: var(--sj-ink-3);
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.preview-tabs button:hover {
  color: var(--sj-ink);
}

.preview-tabs button.is-active {
  color: var(--sj-ink);
  background: var(--sj-paper);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--sj-ink) 8%, transparent);
}

.preview-tabs button:focus-visible {
  outline: 1px solid var(--sj-line-strong);
  outline-offset: 1px;
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

.object-shelf {
  padding-top: 0.25rem;
}

.object-shelf__intro {
  margin-bottom: 1.2rem;
  padding: 1rem 1.1rem 0.9rem;
  border: 1px solid var(--sj-line);
  border-radius: 1px;
  background: color-mix(in srgb, var(--sj-paper) 66%, transparent);
  transform: rotate(-0.25deg);
}

.object-shelf__eyebrow {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--sj-ink-3);
}

.object-shelf__title {
  margin: 0.3rem 0 0;
  font-family: var(--font-family-display);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--sj-ink);
}

.object-shelf__desc {
  max-width: 30rem;
  margin: 0.4rem 0 0;
  font-size: 0.78rem;
  line-height: 1.7;
  color: var(--sj-ink-2);
}

.object-shelf__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.1rem;
  align-items: start;
}

.object-shelf__item {
  position: relative;
  min-width: 0;
  padding: 0.55rem 0.5rem 0.45rem;
  border: 1px solid var(--sj-line);
  border-radius: 1px;
  background: color-mix(in srgb, var(--sj-paper) 82%, transparent);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--sj-ink) 4%, transparent),
    0 14px 24px -24px color-mix(in srgb, var(--sj-ink) 48%, transparent);
  filter: grayscale(1);
  transition:
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 320ms ease;
}

.object-shelf__item::before {
  content: '';
  position: absolute;
  top: -0.46rem;
  left: 50%;
  width: 3.4rem;
  height: 0.95rem;
  transform: translateX(-50%) rotate(-1.5deg);
  background:
    repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--sj-ink) 6%, transparent) 0 2px,
      transparent 2px 5px
    ),
    color-mix(in srgb, #fff 55%, var(--sj-line) 45%);
  opacity: 0.7;
  pointer-events: none;
}

.object-shelf__item--a {
  transform: rotate(-1.1deg);
}

.object-shelf__item--b {
  transform: rotate(0.8deg);
}

.object-shelf__item--c {
  transform: rotate(0.65deg);
}

.object-shelf__item--d {
  transform: rotate(-0.75deg);
}

.object-shelf__item:hover {
  z-index: 2;
  transform: rotate(0deg) translateY(-3px);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--sj-ink) 5%, transparent),
    0 20px 30px -24px color-mix(in srgb, var(--sj-ink) 55%, transparent);
}

.object-shelf__item :deep(.widget-shell) {
  max-width: none;
}

.object-shelf__item :deep(.recent-card) {
  padding: 0.2rem 0 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  transform: none;
}

.object-shelf__item :deep(.recent-card::before) {
  display: none;
}

@media (width <= 720px) {
  .object-shelf__grid {
    grid-template-columns: 1fr;
  }
}

.preview-layout {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 2.2rem;
}

.preview-main {
  width: 100%;
  max-width: 46rem;
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
  color: var(--sj-ink-3);
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
  border-left: 1px solid color-mix(in srgb, var(--sj-ink-3) 35%, transparent);
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
