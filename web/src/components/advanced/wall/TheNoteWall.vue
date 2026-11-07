<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <section class="wall-stage" :class="{ 'wall-stage--flow': !isDesktop }">
    <div class="wall-stage__bar">
      <span class="wall-stage__count">{{ notesCountText }}</span>

      <span v-if="selectedDate" class="wall-stage__filter">
        <span class="wall-stage__filter-date">{{ formattedSelectedDate }}</span>
        <button type="button" class="wall-stage__clear" @click="emit('clear-date')">
          {{ t('wall.all') }}
        </button>
      </span>
    </div>

    <div v-if="loading && echoes.length === 0" class="wall-stage__state">
      <TheLoadingIndicator size="lg" :label="t('homeFeed.loading')" />
    </div>

    <div v-else-if="echoes.length === 0" class="wall-stage__state">
      <div class="wall-stage__empty-sheet">
        <span class="wall-stage__empty-date" aria-hidden="true">· · ·</span>
        <p>{{ selectedDate ? t('wall.emptyDay') : t('wall.empty') }}</p>
      </div>
    </div>

    <div
      v-else-if="isDesktop"
      class="wall-board"
      :class="{ 'wall-board--filtered': !!selectedDate }"
      :style="{ '--wall-columns': noteColumns.length }"
    >
      <div
        v-for="(column, columnIndex) in noteColumns"
        :key="columnIndex"
        class="wall-board__column"
      >
        <TheWallNote
          v-for="(echo, index) in column"
          :key="echo.id"
          stacked
          :echo="echo"
          :paper="flowMeta(echo).paper"
          :fastener="flowMeta(echo).fastener"
          size="md"
          :width="0"
          :height="0"
          :rotation="flowMeta(echo).rotation * 0.5"
          :z-index="index + 1"
          :delay="Math.min((columnIndex * 3 + index) * 16, 220)"
          @open="handleOpen"
        />
      </div>
    </div>

    <div v-else class="wall-flow">
      <div v-for="(echo, index) in displayEchoes" :key="echo.id" class="wall-flow__item">
        <TheWallNote
          flow
          :echo="echo"
          :paper="flowMeta(echo).paper"
          :fastener="flowMeta(echo).fastener"
          :size="index < 2 ? 'md' : 'sm'"
          :width="0"
          :height="0"
          :rotation="flowMeta(echo).rotation * 0.42"
          :z-index="index + 1"
          :delay="Math.min(index * 8, 180)"
          @open="handleOpen"
        />
      </div>
    </div>

    <button
      v-if="!isDesktop && canLoadMore"
      type="button"
      class="wall-more"
      :disabled="loadingMore"
      @click="emit('load-more')"
    >
      {{ loadingMore ? t('homeFeed.loading') : t('wall.loadMore') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import TheLoadingIndicator from '@/components/common/TheLoadingIndicator.vue'
import TheWallNote from './TheWallNote.vue'
import {
  formatWallDay,
  wallBody,
  wallNoteMeta,
  type WallEcho,
  type WallFastener,
  type WallNoteMeta,
  type WallPaper,
} from '@/utils/wall'

const props = defineProps<{
  echoes: WallEcho[]
  selectedDate: string | null
  loading?: boolean
  canLoadMore?: boolean
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  (
    event: 'open',
    payload: {
      echo: WallEcho
      rect: DOMRect
      meta: { paper: WallPaper; fastener: WallFastener; rotation: number }
    },
  ): void
  (event: 'clear-date'): void
  (event: 'load-more'): void
}>()

const { t } = useI18n()
const isDesktop = useMediaQuery('(min-width: 1080px)')

const DESKTOP_LIMIT = 9
const displayEchoes = computed(() =>
  isDesktop.value ? props.echoes.slice(0, DESKTOP_LIMIT) : props.echoes,
)

const formattedSelectedDate = computed(() =>
  props.selectedDate ? formatWallDay(props.selectedDate) : '',
)
const notesCountText = computed(() => {
  const shown = displayEchoes.value.length
  const total = props.echoes.length
  const count =
    isDesktop.value && !props.selectedDate && total > shown ? `${shown} / ${total}` : shown
  return t('wall.notesCount', { count })
})

const metaCache = new Map<string, WallNoteMeta>()
const flowMeta = (echo: WallEcho): WallNoteMeta => {
  const cached = metaCache.get(echo.id)
  if (cached) return cached
  const meta = wallNoteMeta(echo)
  metaCache.set(echo.id, meta)
  return meta
}

const columnCount = computed(() => {
  if (!isDesktop.value) return 1
  if (props.selectedDate) return Math.min(3, Math.max(1, displayEchoes.value.length))
  return 3
})

// Newest notes arrive at the right column, next to the calendar. The rest
// fill the column with the least estimated paper height so the wall stays level.
const noteColumns = computed<WallEcho[][]>(() => {
  const count = columnCount.value
  const columns = Array.from({ length: count }, () => [] as WallEcho[])
  const heights = Array.from({ length: count }, () => 0)
  const estimate = (echo: WallEcho): number => {
    const text = wallBody(echo.content, 160)
    const lines = Math.min(
      8,
      text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 23)), 0),
    )
    const image = (echo.echo_files?.length ?? 0) > 0 ? 110 : 0
    return 74 + lines * 22 + image
  }

  displayEchoes.value.forEach((echo, index) => {
    const target =
      index < count ? count - 1 - index : heights.indexOf(Math.min(...heights))
    columns[target]!.push(echo)
    heights[target]! += estimate(echo) + 18
  })
  return columns
})

const handleOpen = (payload: {
  echo: WallEcho
  event: MouseEvent
  meta: { paper: WallPaper; fastener: WallFastener; rotation: number }
}) => {
  const rect = (payload.event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
  if (!rect) return
  emit('open', { echo: payload.echo, rect, meta: payload.meta })
}

</script>

<style scoped>
.wall-stage {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.wall-stage__bar {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.1rem;
  padding: 0.15rem 0.3rem 0.45rem;
}

.wall-stage__count {
  padding: 0.16rem 0.42rem;
  border: 1px dashed rgb(90 70 45 / 34%);
  border-radius: 1px;
  font-family: var(--font-family-display);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  color: rgb(58 50 40 / 68%);
  white-space: nowrap;
}

.wall-stage__filter {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  padding: 0.14rem 0.22rem 0.14rem 0.55rem;
  background: rgb(246 240 227 / 94%);
  border: 1px solid rgb(70 52 32 / 24%);
  border-radius: 1px;
  box-shadow: 0 4px 10px -8px rgb(0 0 0 / 55%);
  transform: rotate(0.4deg);
}

.wall-stage__filter-date {
  font-family: var(--font-family-display);
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  color: rgb(52 42 30 / 78%);
  white-space: nowrap;
}

.wall-stage__clear {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.18rem 0.46rem;
  border: 1px solid rgb(70 52 32 / 24%);
  border-radius: 1px;
  background: transparent;
  font-family: var(--font-family-display);
  font-size: 0.6rem;
  letter-spacing: 0.06em;
  color: rgb(52 42 30 / 68%);
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.wall-stage__clear:hover {
  border-color: rgb(52 42 30 / 46%);
  background: rgb(52 42 30 / 7%);
  color: rgb(38 30 21 / 92%);
}

.wall-stage__clear:focus-visible {
  outline: 2px solid rgb(90 70 45 / 70%);
  outline-offset: 2px;
}

.wall-board {
  display: grid;
  grid-template-columns: repeat(var(--wall-columns, 3), minmax(0, 1fr));
  gap: clamp(0.9rem, 1.6vw, 1.4rem);
  align-items: start;
  flex: 1 1 auto;
  min-height: 0;
  padding: 0.15rem 0.5rem 0;
  overflow: hidden;
}

.wall-board__column {
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
  min-width: 0;
}

.wall-board__column:nth-child(1) {
  padding-top: 1rem;
}

.wall-board__column:nth-child(2) {
  padding-top: 0.15rem;
}

.wall-board__column:nth-child(3) {
  padding-top: 0.55rem;
}

.wall-board--filtered {
  grid-template-columns: repeat(var(--wall-columns, 3), minmax(0, 21rem));
  place-content: center;
  padding-top: 0.4rem;
}

.wall-board--filtered .wall-board__column {
  padding-top: 0;
}

.wall-stage__state {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.wall-stage__empty-sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.4rem 2rem;
  background: rgb(246 240 227 / 90%);
  border: 1px solid rgb(70 52 32 / 22%);
  box-shadow: 0 14px 30px -24px rgb(0 0 0 / 60%);
  transform: rotate(-0.4deg);
}

.wall-stage__empty-sheet p {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: rgb(52 42 30 / 72%);
}

.wall-stage__empty-date {
  font-family: var(--font-family-display);
  font-size: 0.62rem;
  letter-spacing: 0.3em;
  color: rgb(52 42 30 / 38%);
}

.wall-flow {
  width: min(100%, 42rem);
  margin: 0 auto;
  padding: 0.1rem 0.1rem 5.4rem;
  column-count: 1;
  column-gap: 0.9rem;
}

.wall-flow__item {
  display: inline-block;
  width: 100%;
  margin-bottom: 1rem;
  break-inside: avoid;
}

.wall-stage--flow {
  height: auto;
}

.wall-stage--flow .wall-stage__bar {
  position: sticky;
  top: 0;
  z-index: 30;
  width: min(100%, 42rem);
  margin: 0 auto 0.35rem;
  padding: 0.35rem 0.1rem 0.5rem;
  background: linear-gradient(
    to bottom,
    rgb(238 232 221 / 94%),
    rgb(238 232 221 / 82%) 70%,
    transparent
  );
  backdrop-filter: blur(4px);
}

.wall-stage--flow .wall-stage__count {
  color: rgb(58 50 40 / 78%);
}

.wall-more {
  align-self: center;
  margin: 0.4rem auto 1.6rem;
  padding: 0.5rem 1.2rem;
  border: 1px solid rgb(90 70 45 / 28%);
  border-radius: 1px;
  background: rgb(246 240 227 / 92%);
  box-shadow: 0 8px 18px -16px rgb(0 0 0 / 55%);
  font-family: var(--font-family-display);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: rgb(52 42 30 / 78%);
  cursor: pointer;
  transform: rotate(-0.35deg);
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.wall-more:hover {
  border-color: rgb(52 42 30 / 46%);
  background: rgb(250 246 236 / 96%);
  color: rgb(38 30 21 / 94%);
  transform: rotate(0deg) translateY(-1px);
}

.wall-more:disabled {
  cursor: default;
  opacity: 0.6;
}

.wall-more:focus-visible {
  outline: 2px solid rgb(58 50 40 / 55%);
  outline-offset: 2px;
}
</style>
