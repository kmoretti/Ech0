<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <section class="wall-stage" :class="{ 'wall-stage--flow': !isDesktop }">
    <div class="wall-stage__bar">
      <span class="wall-stage__count">{{
        t('wall.notesCount', { count: displayEchoes.length })
      }}</span>

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

    <div v-else-if="isDesktop" ref="canvasRef" class="wall-canvas">
      <TheWallNote
        v-for="(placed, index) in placedNotes"
        :key="placed.echo.id"
        :echo="placed.echo"
        :paper="placed.meta.paper"
        :fastener="placed.meta.fastener"
        :size="placed.size"
        :width="placed.width"
        :height="placed.height"
        :x="placed.x"
        :y="placed.y"
        :rotation="placed.meta.rotation"
        :z-index="placed.zIndex"
        :delay="Math.min(index * 9, 240)"
        :featured="index < 2"
        @open="handleOpen"
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
import { computed, nextTick, ref, watch } from 'vue'
import { useMediaQuery, useResizeObserver } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import TheLoadingIndicator from '@/components/common/TheLoadingIndicator.vue'
import TheWallNote from './TheWallNote.vue'
import {
  formatWallDay,
  hashString,
  mulberry32,
  wallNoteMeta,
  type WallEcho,
  type WallNoteMeta,
} from '@/utils/wall'

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

const props = defineProps<{
  echoes: WallEcho[]
  selectedDate: string | null
  loading?: boolean
  canLoadMore?: boolean
  loadingMore?: boolean
}>()

const emit = defineEmits<{
  (event: 'open', payload: { echo: WallEcho; rect: DOMRect }): void
  (event: 'clear-date'): void
  (event: 'load-more'): void
}>()

const { t } = useI18n()
const isDesktop = useMediaQuery('(min-width: 1080px)')
const canvasRef = ref<HTMLElement | null>(null)
const canvasSize = ref({ width: 0, height: 0 })
const placedNotes = ref<Placed[]>([])

const displayEchoes = computed(() => (isDesktop.value ? props.echoes.slice(0, 50) : props.echoes))

const formattedSelectedDate = computed(() =>
  props.selectedDate ? formatWallDay(props.selectedDate) : '',
)

const SHAPES: Record<WallSize, { width: number; height: number }> = {
  xs: { width: 138, height: 100 },
  sm: { width: 164, height: 118 },
  md: { width: 198, height: 146 },
  lg: { width: 248, height: 180 },
  xl: { width: 320, height: 232 },
}

const metaCache = new Map<string, WallNoteMeta>()
const flowMeta = (echo: WallEcho): WallNoteMeta => {
  const cached = metaCache.get(echo.id)
  if (cached) return cached
  const meta = wallNoteMeta(echo)
  metaCache.set(echo.id, meta)
  return meta
}

const sizeFor = (index: number, count: number): WallSize => {
  if (props.selectedDate) {
    if (count === 1) return 'xl'
    if (count <= 3) return 'lg'
    return 'md'
  }
  if (index === 0) return 'xl'
  if (index <= 3) return 'lg'
  if (index <= 9) return 'md'
  return index % 3 === 0 ? 'sm' : 'xs'
}

const Z_INDEX: Record<WallSize, number> = {
  xl: 1000,
  lg: 2000,
  md: 3000,
  sm: 4000,
  xs: 5000,
}

const layoutFreeform = (count: number) => {
  const { width, height } = canvasSize.value
  if (!width || !height) return []
  const random = mulberry32(
    hashString(
      `${displayEchoes.value.map((echo) => echo.id).join('|')}:${props.selectedDate ?? 'all'}`,
    ),
  )

  const cols = Math.max(5, Math.round(Math.sqrt((count * width) / height) * 0.88))
  const rows = Math.max(4, Math.ceil(count / cols))
  const cellWidth = width / cols
  const cellHeight = height / rows
  const cellArea = cellWidth * cellHeight
  const cells = Array.from({ length: cols * rows }, (_, index) => ({
    col: index % cols,
    row: Math.floor(index / cols),
    jitterX: (random() - 0.5) * cellWidth * 0.2,
    jitterY: (random() - 0.5) * cellHeight * 0.18,
  }))

  const factors: Record<WallSize, number> = {
    xs: 1,
    sm: 1.08,
    md: 1.18,
    lg: 1.36,
    xl: 1.68,
  }

  const placed: Placed[] = []
  const usedCells = new Set<string>()

  const overlapArea = (rect: { x: number; y: number; width: number; height: number }) =>
    placed.reduce((sum, other) => {
      const dx = Math.min(rect.x + rect.width, other.x + other.width) - Math.max(rect.x, other.x)
      const dy = Math.min(rect.y + rect.height, other.y + other.height) - Math.max(rect.y, other.y)
      return sum + (dx > 0 && dy > 0 ? dx * dy : 0)
    }, 0)

  for (let index = 0; index < count; index++) {
    const echo = displayEchoes.value[index]!
    const size = sizeFor(index, count)
    const shape = SHAPES[size]
    const factor = factors[size]
    const scale = Math.min((cellWidth * factor) / shape.width, (cellHeight * factor) / shape.height)
    const noteWidth = Math.round(shape.width * scale)
    const noteHeight = Math.round(shape.height * scale)
    const newest = index < 6

    let best: { x: number; y: number; score: number; key: string } | null = null
    for (const cell of cells) {
      const key = `${cell.col}:${cell.row}`
      const x = Math.round(
        Math.max(
          18,
          Math.min(
            width - noteWidth - 18,
            cell.col * cellWidth + (cellWidth - noteWidth) / 2 + cell.jitterX,
          ),
        ),
      )
      const y = Math.round(
        Math.max(
          18,
          Math.min(
            height - noteHeight - 34,
            cell.row * cellHeight + (cellHeight - noteHeight) / 2 + cell.jitterY,
          ),
        ),
      )
      let score = overlapArea({ x, y, width: noteWidth, height: noteHeight }) * 1.25
      if (usedCells.has(key)) score += cellArea * 1.8
      if (newest) {
        // The newest notes stay close to the calendar in the top-right corner.
        score += (1 - (x + noteWidth / 2) / width) * cellArea * 2.6
        score += ((y + noteHeight / 2) / height) * cellArea * 1.8
      }
      score += random() * cellArea * 0.16
      if (!best || score < best.score) best = { x, y, score, key }
    }

    const target = best ?? { x: 18, y: 18, key: '' }
    for (const cell of cells) {
      const centerX = cell.col * cellWidth + cellWidth / 2
      const centerY = cell.row * cellHeight + cellHeight / 2
      if (
        centerX >= target.x - cellWidth * 0.18 &&
        centerX <= target.x + noteWidth + cellWidth * 0.18 &&
        centerY >= target.y - cellHeight * 0.15 &&
        centerY <= target.y + noteHeight + cellHeight * 0.15
      ) {
        usedCells.add(`${cell.col}:${cell.row}`)
      }
    }
    placed.push({
      echo,
      meta: wallNoteMeta(echo, index < 2),
      size,
      width: noteWidth,
      height: noteHeight,
      x: target.x,
      y: target.y,
      // Small notes sit on top of the large background pieces so every
      // label stays readable in the collage.
      zIndex: Z_INDEX[size] + (count - index),
    })
  }

  return placed
}

const layoutFiltered = (count: number) => {
  const { width, height } = canvasSize.value
  if (!width || !height) return []
  const columns = count <= 1 ? 1 : count <= 4 ? 2 : 3
  const gap = Math.max(22, Math.min(42, width * 0.028))
  const shapeFor = () => (count === 1 ? SHAPES.xl : count <= 4 ? SHAPES.lg : SHAPES.md)
  const rows: { echo: WallEcho; size: WallSize; width: number; height: number }[][] = []

  let row: (typeof rows)[number] = []
  rows.push(row)
  for (let index = 0; index < count; index++) {
    const echo = displayEchoes.value[index]!
    const size = count === 1 ? 'xl' : count <= 4 ? 'lg' : 'md'
    const shape = shapeFor()
    const fitWidth = (width - gap * 2) / columns - gap * 0.2
    const preferred = shape.width * (count <= 2 ? 1.45 : count <= 4 ? 1.2 : 1.12)
    const targetWidth = Math.min(fitWidth, preferred)
    const scale = targetWidth / shape.width
    const item = {
      echo,
      size: size as WallSize,
      width: Math.round(targetWidth),
      height: Math.round(shape.height * scale),
    }
    const rowWidth = row.reduce((sum, cell) => sum + cell.width, 0) + gap * row.length
    if (row.length > 0 && (row.length >= columns || rowWidth + gap + item.width > width - 24)) {
      row = []
      rows.push(row)
    }
    row.push(item)
  }

  const rowHeights = rows.map((cells) => Math.max(...cells.map((cell) => cell.height), 0))
  const totalHeight = rowHeights.reduce((sum, value) => sum + value, 0) + gap * (rows.length - 1)
  let cursorY = Math.max(12, (height - totalHeight) / 2)
  const placed: Placed[] = []
  let order = 0

  rows.forEach((cells, rowIndex) => {
    const rowWidth = cells.reduce((sum, cell) => sum + cell.width, 0) + gap * (cells.length - 1)
    let cursorX = Math.max(12, (width - rowWidth) / 2)
    cells.forEach((cell) => {
      const meta = wallNoteMeta(cell.echo, true)
      placed.push({
        echo: cell.echo,
        meta,
        size: cell.size as WallSize,
        width: cell.width,
        height: cell.height,
        x: Math.round(cursorX),
        y: Math.round(cursorY),
        zIndex: 20 + order,
      })
      cursorX += cell.width + gap
      order += 1
    })
    cursorY += rowHeights[rowIndex]! + gap
  })

  return placed
}

const buildLayout = () => {
  if (!isDesktop.value) {
    placedNotes.value = []
    return
  }
  const count = displayEchoes.value.length
  placedNotes.value =
    props.selectedDate || count <= 4 ? layoutFiltered(count) : layoutFreeform(count)
}

const handleOpen = (payload: { echo: WallEcho; event: MouseEvent }) => {
  const rect = (payload.event.currentTarget as HTMLElement | null)?.getBoundingClientRect()
  if (!rect) return
  emit('open', { echo: payload.echo, rect })
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
  nextTick(buildLayout)
})

watch(
  () => [
    displayEchoes.value.map((echo) => echo.id).join('|'),
    props.selectedDate,
    isDesktop.value,
    canvasSize.value.width,
    canvasSize.value.height,
  ],
  () => nextTick(buildLayout),
  { immediate: true },
)

watch(
  () => displayEchoes.value.length,
  () => {
    metaCache.clear()
  },
)
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
