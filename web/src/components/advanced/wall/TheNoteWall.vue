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
      ref="canvasRef"
      class="wall-canvas"
      :class="{ 'wall-canvas--ready': layoutReady }"
    >
      <TheWallNote
        v-for="(placed, index) in placedNotes"
        :key="placed.echo.id"
        :echo="placed.echo"
        :paper="placed.meta.paper"
        :fastener="placed.meta.fastener"
        :size="placed.size"
        :width="placed.width"
        :height="0"
        :x="placed.x"
        :y="placed.y"
        :rotation="placed.meta.rotation"
        :z-index="placed.zIndex"
        :delay="Math.min(index * 16, 220)"
        @open="handleOpen"
        @view-detail="handleViewDetail"
      />
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
          @view-detail="handleViewDetail"
        />
      </div>
    </div>

    <button
      v-if="!isDesktop && hasMoreMobile"
      type="button"
      class="wall-more"
      :disabled="loadingMore"
      @click="handleMobileMore"
    >
      {{ loadingMore ? t('homeFeed.loading') : t('wall.loadMore') }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMediaQuery, useResizeObserver } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { getEchoFiles } from '@/utils/echo'
import TheLoadingIndicator from '@/components/common/TheLoadingIndicator.vue'
import TheWallNote from './TheWallNote.vue'
import {
  formatWallDay,
  hashString,
  mulberry32,
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
  (event: 'view-detail', echo: WallEcho): void
  (event: 'clear-date'): void
  (event: 'load-more'): void
}>()

type WallSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Placed = {
  echo: WallEcho
  meta: WallNoteMeta
  size: WallSize
  width: number
  height: number
  x: number
  y: number
  zIndex: number
}

const { t } = useI18n()
const isDesktop = useMediaQuery('(min-width: 1080px)')
const canvasRef = ref<HTMLElement | null>(null)
const canvasSize = ref({ width: 0, height: 0 })
const placedNotes = ref<Placed[]>([])
const measuredHeights = ref<Record<string, number>>({})
const layoutReady = ref(false)

const WALL_PAGE_SIZE = 16
const DESKTOP_LIMIT = WALL_PAGE_SIZE
const mobileVisibleCount = ref(WALL_PAGE_SIZE)
const displayEchoes = computed(() =>
  isDesktop.value
    ? props.echoes.slice(0, DESKTOP_LIMIT)
    : props.echoes.slice(0, mobileVisibleCount.value),
)
const hasMoreMobile = computed(
  () => mobileVisibleCount.value < props.echoes.length || Boolean(props.canLoadMore),
)

const handleMobileMore = () => {
  mobileVisibleCount.value += WALL_PAGE_SIZE
  if (mobileVisibleCount.value >= props.echoes.length && props.canLoadMore) emit('load-more')
}

watch(
  () => props.selectedDate,
  () => {
    mobileVisibleCount.value = WALL_PAGE_SIZE
  },
)

watch(isDesktop, (desktop) => {
  if (!desktop) mobileVisibleCount.value = WALL_PAGE_SIZE
})

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

const WIDTHS: Record<WallSize, number> = {
  xs: 240,
  sm: 270,
  md: 305,
  lg: 345,
  xl: 390,
}

const sizeAt = (index: number): WallSize =>
  (['xl', 'lg', 'lg', 'lg', 'md', 'md', 'md', 'sm', 'sm'][index] ?? 'sm') as WallSize

const estimateHeight = (echo: WallEcho, width: number): number => {
  const text = wallBody(echo.content, 160)
  const charsPerLine = Math.max(8, Math.floor((width - 34) / 13))
  const lines = Math.min(
    12,
    text
      .split('\n')
      .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0),
  )
  const hasImages = getEchoFiles(echo).some((file) => file.category === 'image')
  const media = hasImages ? Math.min(width * 0.9, width) : 0
  return 74 + lines * 21.5 + (echo.tags?.length ? 22 : 0) + media + 36
}

const intersection = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => {
  const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return dx > 0 && dy > 0 ? dx * dy : 0
}

const placeNotes = (heights: Record<string, number>): Placed[] => {
  const { width: wallWidth, height: wallHeight } = canvasSize.value
  if (!wallWidth || !wallHeight) return []
  const random = mulberry32(
    hashString(
      `${displayEchoes.value.map((echo) => echo.id).join('|')}:${props.selectedDate ?? 'all'}`,
    ),
  )
  const placed: Placed[] = []
  const rects: { x: number; y: number; w: number; h: number }[] = []
  const count = displayEchoes.value.length
  const single = count === 1

  displayEchoes.value.forEach((echo, index) => {
    const size = sizeAt(index)
    const width = Math.min(WIDTHS[size], wallWidth - 40)
    const height = Math.max(
      90,
      Math.min(heights[echo.id] ?? estimateHeight(echo, width), wallHeight - 32),
    )

    let bestX = 16
    let bestY = 16
    if (single) {
      bestX = Math.max(16, (wallWidth - width) / 2)
      bestY = Math.max(16, (wallHeight - height) / 2)
    } else {
      let bestScore = Number.POSITIVE_INFINITY
      for (let attempt = 0; attempt < 110; attempt++) {
        const x = 16 + random() * Math.max(0, wallWidth - width - 32)
        const y = 16 + random() * Math.max(0, wallHeight - height - 40)
        const rect = { x, y, w: width, h: height }
        let score = rects.reduce((sum, other) => sum + intersection(rect, other), 0) * 1.7
        if (index < 3) {
          score += (1 - (x + width / 2) / wallWidth) * wallWidth * wallHeight * 0.5
          score += ((y + height / 2) / wallHeight) * wallWidth * wallHeight * 0.28
        }
        score += random() * wallWidth * wallHeight * 0.008
        if (score < bestScore) {
          bestScore = score
          bestX = x
          bestY = y
        }
      }
    }

    const x = Math.round(Math.min(Math.max(16, bestX), Math.max(16, wallWidth - width - 16)))
    const y = Math.round(Math.min(Math.max(16, bestY), Math.max(16, wallHeight - height - 20)))
    placed.push({
      echo,
      meta: wallNoteMeta(echo, index < 2),
      size,
      width: Math.round(width),
      height: Math.round(height),
      x,
      y,
      zIndex: count - index + 10,
    })
    rects.push({ x, y, w: width, h: height })
  })

  return placed
}

const measureAndPlace = async () => {
  await nextTick()
  const nodes = canvasRef.value?.querySelectorAll<HTMLElement>('.wall-note')
  if (nodes?.length) {
    const next = { ...measuredHeights.value }
    let changed = false
    placedNotes.value.forEach((placed, index) => {
      const height = nodes[index]?.offsetHeight ?? 0
      if (height > 0 && Math.abs((next[placed.echo.id] ?? 0) - height) > 1) {
        next[placed.echo.id] = height
        changed = true
      }
    })
    if (changed) {
      measuredHeights.value = next
      placedNotes.value = placeNotes(next)
      await nextTick()
    }
  }
  layoutReady.value = true
}

const buildLayout = async () => {
  if (!isDesktop.value || !canvasSize.value.width) {
    placedNotes.value = []
    layoutReady.value = false
    return
  }
  layoutReady.value = false
  placedNotes.value = placeNotes(measuredHeights.value)
  await measureAndPlace()
}

useResizeObserver(canvasRef, (entries) => {
  const entry = entries[0]
  if (!entry) return
  const { width, height } = entry.contentRect
  if (
    Math.abs(width - canvasSize.value.width) < 2 &&
    Math.abs(height - canvasSize.value.height) < 2
  )
    return
  canvasSize.value = { width, height }
  void buildLayout()
})

watch(
  () => [displayEchoes.value.map((echo) => echo.id).join('|'), props.selectedDate, isDesktop.value],
  () => void buildLayout(),
  { immediate: true },
)

let remeasureTimer = 0
onMounted(() => {
  // The async media galleries can change a note's height after the first pass.
  remeasureTimer = window.setTimeout(() => void buildLayout(), 450)
})
onBeforeUnmount(() => window.clearTimeout(remeasureTimer))

const handleOpen = (payload: {
  echo: WallEcho
  event: MouseEvent
  meta: { paper: WallPaper; fastener: WallFastener; rotation: number }
}) => {
  const rect = (payload.event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
  if (!rect) return
  emit('open', { echo: payload.echo, rect, meta: payload.meta })
}

const handleViewDetail = (echo: WallEcho) => emit('view-detail', echo)
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

.wall-canvas {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: opacity 260ms ease;
}

.wall-canvas--ready {
  opacity: 1;
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
