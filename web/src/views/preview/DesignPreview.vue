<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <TheWallShell>
    <template #main>
      <div v-if="view === 'notes'" class="preview-wall">
        <TheNoteWall
          :echoes="filteredEchoes"
          :selected-date="selectedDate"
          @open="openEcho"
          @clear-date="selectedDate = null"
        />
      </div>

      <div v-else class="preview-objects">
        <div class="object-shelf">
          <div class="object-shelf__intro">
            <h2 class="object-shelf__title">桌角的小物件</h2>
            <p class="object-shelf__desc">
              热力图、AI 摘要、连接节点与评论，与墙上的便签共用纸色、墨色和阴影。
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
        </div>
      </div>
    </template>

    <template #side>
      <TheWallRail
        :echoes="wallPool"
        :marks="marks"
        :selected-date="selectedDate"
        :latest-stamp="latestStamp"
        active-tab="home"
        :connects="demoConnects"
        :agent-enabled="false"
        :recent-text="demoRecent"
        :calendar-open="calendarOpen"
        @update:selected-date="handleSelectDate"
        @open-tab="handleTab"
        @open-settings="router.push({ name: 'panel' })"
        @open-search="router.push({ name: 'home' })"
        @toggle-calendar="calendarOpen = !calendarOpen"
      />
    </template>
  </TheWallShell>

  <div class="preview-switch" role="tablist">
    <button
      type="button"
      role="tab"
      :aria-selected="view === 'notes'"
      :class="{ 'is-active': view === 'notes' }"
      @click="view = 'notes'"
    >
      便笺墙
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

  <TheEchoLightbox
    v-model="activeEcho"
    :origin-rect="activeRect"
    :origin-meta="activeMeta"
    @view-detail="goDetail"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import TheWallShell from '@/components/advanced/wall/TheWallShell.vue'
import TheNoteWall from '@/components/advanced/wall/TheNoteWall.vue'
import TheWallRail from '@/views/home/modules/wall/TheWallRail.vue'
import TheEchoLightbox from '@/components/advanced/wall/TheEchoLightbox.vue'
import {
  TheCommentWidget,
  TheConnectWidget,
  TheHeatMap,
  TheRecentCard,
} from '@/components/advanced/widget'
import { wallDayKey, wallEchoTime, type WallEcho, type WallNoteMeta } from '@/utils/wall'
import { demoEchoes } from './demoEchoes'

const router = useRouter()
const view = ref<'notes' | 'objects'>('notes')
const selectedDate = ref<string | null>(null)
const activeEcho = ref<WallEcho | null>(null)
const activeRect = ref<{ left: number; top: number; width: number; height: number } | null>(null)
const activeMeta = ref<WallNoteMeta | null>(null)
const calendarOpen = ref(false)

onMounted(() => document.documentElement.classList.add('wall-mode'))
onBeforeUnmount(() => document.documentElement.classList.remove('wall-mode'))

const sortedEchoes = computed(() =>
  [...demoEchoes].sort((a, b) => wallEchoTime(b) - wallEchoTime(a)),
)
const wallPool = computed(() => sortedEchoes.value.slice(0, 16))
const marks = computed(() => [...new Set(wallPool.value.map((echo) => wallDayKey(echo)))])
const latestStamp = computed(() =>
  wallPool.value[0] ? wallEchoTime(wallPool.value[0]!) : undefined,
)
const filteredEchoes = computed(() =>
  selectedDate.value
    ? wallPool.value.filter((echo) => wallDayKey(echo) === selectedDate.value)
    : wallPool.value,
)

const handleSelectDate = (value: string | null) => {
  selectedDate.value = value
  if (value) calendarOpen.value = false
}

const openEcho = ({
  echo,
  rect,
  meta,
}: {
  echo: WallEcho
  rect: DOMRect
  meta: WallNoteMeta
}) => {
  activeEcho.value = echo
  activeMeta.value = meta
  activeRect.value = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

const goDetail = (echo: WallEcho) => {
  activeEcho.value = null
  void router.push({ name: 'echo', params: { echoId: String(echo.id) } })
}

const handleTab = (tab: 'home' | 'publish' | 'hub') => {
  void router.push(tab === 'home' ? { name: 'home' } : { name: 'home', query: { tab } })
}

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
  version: '5.9.5',
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
.preview-wall {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.preview-objects {
  width: 100%;
  height: 100%;
  padding: 0.2rem 0.2rem 1rem;
  overflow-y: auto;
  scrollbar-width: none;
}

.preview-objects::-webkit-scrollbar {
  display: none;
}

.object-shelf {
  max-width: 52rem;
  margin: 0 auto;
}

.object-shelf__intro {
  margin-bottom: 1.1rem;
  padding: 0.95rem 1.1rem 0.85rem;
  border: 1px solid rgb(92 72 48 / 22%);
  border-radius: 2px 12px 2px 2px;
  background: rgb(246 240 227 / 92%);
  box-shadow: 0 18px 34px -28px rgb(0 0 0 / 65%);
  transform: rotate(-0.28deg);
}

.object-shelf__title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #332b22;
}

.object-shelf__desc {
  max-width: 32rem;
  margin: 0.4rem 0 0;
  font-family: var(--font-family-display);
  font-size: 0.76rem;
  line-height: 1.7;
  color: rgb(60 50 40 / 68%);
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
  border: 1px solid rgb(92 72 48 / 20%);
  border-radius: 1px;
  background: rgb(246 240 227 / 94%);
  box-shadow:
    0 1px 0 rgb(255 255 255 / 35%),
    0 18px 30px -26px rgb(0 0 0 / 60%);
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
    repeating-linear-gradient(90deg, rgb(70 52 32 / 6%) 0 2px, transparent 2px 5px),
    rgb(244 236 216 / 78%);
  opacity: 0.8;
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
    0 1px 0 rgb(255 255 255 / 35%),
    0 24px 36px -26px rgb(0 0 0 / 62%);
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

.preview-switch {
  position: fixed;
  right: 1.1rem;
  bottom: 1.1rem;
  z-index: 10010;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.22rem;
  background: rgb(246 240 227 / 94%);
  border: 1px solid rgb(70 52 32 / 26%);
  border-radius: 2px;
  box-shadow: 0 12px 28px -18px rgb(0 0 0 / 60%);
  transform: rotate(-0.4deg);
}

.preview-switch button {
  padding: 0.24rem 0.62rem;
  border: 0;
  border-radius: 1px;
  background: transparent;
  font-family: var(--font-family-display);
  font-size: 0.64rem;
  letter-spacing: 0.06em;
  color: rgb(70 56 40 / 58%);
  cursor: pointer;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.preview-switch button:hover {
  color: #2e2720;
}

.preview-switch button.is-active {
  background: rgb(52 42 30 / 10%);
  color: #2e2720;
}

@media (width <= 720px) {
  .preview-switch {
    right: 0.7rem;
    bottom: 0.7rem;
    transform: none;
  }

  .object-shelf__grid {
    grid-template-columns: 1fr;
  }
}
</style>
