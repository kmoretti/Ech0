<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="px-2">
    <div class="widget heatmap-widget bg-transparent! w-full max-w-[19rem] mx-auto rounded-md">
      <div class="heatmap-grid-wrap">
        <div class="heatmap-grid">
          <div v-for="col in 10" :key="col" class="heatmap-col">
            <div
              v-for="row in 3"
              :key="row"
              class="heatmap-cell"
              :style="{ backgroundColor: getColor(getCell(row - 1, col - 1)?.count ?? 0) }"
              @mouseenter="showTooltip(row - 1, col - 1, $event)"
              @mouseleave="hideTooltip"
            ></div>
          </div>
        </div>
      </div>
    </div>
    <Teleport to="body">
      <div
        v-if="tooltip.visible"
        class="heatmap-tooltip"
        :class="`heatmap-tooltip--${tooltip.placement}`"
        :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
      >
        {{ tooltip.text }}
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchGetHeatMap } from '@/service/api'
import { useI18n } from 'vue-i18n'
import {
  HOME_CACHE_TTL,
  HOME_HEATMAP_CACHE_KEY,
  readHomeCache,
  refreshHomeCacheInBackground,
  writeHomeCache,
} from '@/utils/home-cache'

type HeatmapCachePayload = {
  data: App.Api.Ech0.HeatMap
}

const heatmapData = ref<App.Api.Ech0.HeatMap>([])
const { t } = useI18n()

const grid = computed(() => {
  const cells = [...heatmapData.value]
  const total = 3 * 10
  while (cells.length < total) cells.push({ date: '', count: 0 } as App.Api.Ech0.HeatMap[0])
  const result: (App.Api.Ech0.HeatMap[0] | null)[][] = []
  for (let row = 0; row < 3; row++) {
    result.push(cells.slice(row * 10, (row + 1) * 10))
  }
  return result
})

const getCell = (row: number, col: number) => {
  return grid.value[row]?.[col] ?? null
}

const getColor = (count: number): string => {
  if (count >= 4) return 'var(--heatmap-bg-color-4)'
  if (count >= 3) return 'var(--heatmap-bg-color-3)'
  if (count >= 2) return 'var(--heatmap-bg-color-2)'
  if (count >= 1) return 'var(--heatmap-bg-color-1)'
  return 'var(--heatmap-bg-color-0)'
}

const tooltip = ref({
  visible: false,
  text: '',
  x: 0,
  y: 0,
  placement: 'top' as 'top' | 'bottom',
})

function showTooltip(row: number, col: number, event: MouseEvent) {
  const cell = getCell(row, col)
  if (cell) {
    tooltip.value.text = t('heatmap.tooltip', { date: cell.date ?? '', count: cell.count ?? 0 })
    tooltip.value.visible = true

    const target = event.target as HTMLElement
    const rect = target.getBoundingClientRect()
    const viewportPadding = 14
    const centerX = rect.left + rect.width / 2

    tooltip.value.x = Math.min(Math.max(centerX, viewportPadding), window.innerWidth - viewportPadding)
    if (rect.top < 40) {
      tooltip.value.placement = 'bottom'
      tooltip.value.y = rect.bottom + 10
    } else {
      tooltip.value.placement = 'top'
      tooltip.value.y = rect.top - 10
    }
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}

const fetchHeatmapPayload = async (): Promise<HeatmapCachePayload | null> => {
  const res = await fetchGetHeatMap()
  return { data: res.data }
}

onMounted(() => {
  const cached = readHomeCache<HeatmapCachePayload>(HOME_HEATMAP_CACHE_KEY)
  if (cached) {
    heatmapData.value = cached.data.data
    if (!cached.fresh) {
      void refreshHomeCacheInBackground(HOME_HEATMAP_CACHE_KEY, HOME_CACHE_TTL, fetchHeatmapPayload)
    }
    return
  }

  fetchHeatmapPayload().then((payload) => {
    if (!payload) return
    heatmapData.value = payload.data
    writeHomeCache(HOME_HEATMAP_CACHE_KEY, payload, HOME_CACHE_TTL)
  })
})
</script>

<style scoped>
.heatmap-widget {
  padding: clamp(0.75rem, 4vw, 1rem);
}

.heatmap-grid-wrap {
  width: 100%;
  aspect-ratio: 10 / 3;
}

.heatmap-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: clamp(0.18rem, 1.2vw, 0.3rem);
  width: 100%;
  height: 100%;
}

.heatmap-col {
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: clamp(0.18rem, 1.2vw, 0.3rem);
  min-width: 0;
}

.heatmap-cell {
  width: 100%;
  height: 100%;
  border-radius: 7px;
  box-shadow: inset 0 0 0 1px var(--color-border-subtle);
  transition:
    box-shadow 180ms ease,
    transform 180ms ease;
}

.heatmap-cell:hover {
  box-shadow:
    inset 0 0 0 1px var(--color-border-strong),
    0 4px 10px rgb(0 0 0 / 6%);
  transform: translateY(-1px);
}

.heatmap-tooltip {
  position: fixed;
  z-index: 10000;
  max-width: min(14rem, calc(100vw - 1.5rem));
  padding: 0.45rem 0.62rem;
  color: #fff;
  background: linear-gradient(135deg, #f97316, #ea580c);
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: var(--radius-sm);
  box-shadow: 0 12px 32px rgb(234 88 12 / 28%);
  font-size: 0.75rem;
  line-height: 1.35;
  white-space: nowrap;
  pointer-events: none;
}

.heatmap-tooltip--top {
  transform: translate(-50%, -100%);
}

.heatmap-tooltip--bottom {
  transform: translate(-50%, 0);
}

.heatmap-tooltip::after {
  position: absolute;
  left: 50%;
  width: 0.45rem;
  height: 0.45rem;
  background: #ea580c;
  content: '';
  transform: translateX(-50%) rotate(45deg);
}

.heatmap-tooltip--top::after {
  bottom: -0.23rem;
}

.heatmap-tooltip--bottom::after {
  top: -0.23rem;
}
</style>
