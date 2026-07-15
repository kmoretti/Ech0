<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div
    :class="{ 'hub-page--embedded': props.embedded }"
    class="w-full px-2 pb-4 py-2 mt-4 sm:mt-0 mb-10 sm:mb-0 mx-auto flex justify-center items-start"
  >
    <div ref="mainColumn" class="mx-auto px-2 text-[var(--color-text-muted)] w-full">
      <template v-if="embedded">
        <div class="hub-embedded-nav">
          <button type="button" class="hub-embedded-nav__back" @click="router.push({ name: 'home' })">
            <Arrow class="hub-embedded-nav__icon" />
            <span>{{ t('commonNav.backHome') }}</span>
          </button>
        </div>
      </template>

      <template v-else>
        <h1
          class="text-4xl md:text-6xl italic font-bold font-serif text-center text-[var(--color-text-muted)]"
        >
          Ech0 Hub
        </h1>

        <div class="w-full max-w-sm mx-auto">
          <BaseButton
            @click="router.push('/')"
            :class="getButtonClasses('', true)"
            :tooltip="t('commonNav.backHome')"
          >
            <Arrow
              class="w-9 h-9 rotate-180 transition-transform duration-200 group-hover:-translate-x-1"
            />
          </BaseButton>
        </div>
      </template>

      <div
        v-if="echoList.length > 0 && !hubBusy"
        ref="embeddedGridRef"
        class="hub-masonry-grid"
      >
        <div
          v-for="(item, index) in echoList"
          :key="item.virtual_key"
          :ref="registerEmbeddedCell"
          class="hub-masonry-cell"
          :style="{ '--enter-index': Math.min(index, 14) }"
        >
          <TheHubEcho :echo="item" />
        </div>
      </div>

      <div v-if="hubBusy" class="hub-loading-panel">
        <TheLoadingIndicator :label="t('hub.loading')" />
      </div>
      <div
        v-else-if="echoList.length === 0 && hasTriedInitialLoad && !isPreparing && !isLoading"
        class="my-6"
      >
        <p class="text-[var(--color-text-secondary)] text-center">
          {{ t('hub.emptyConnectHint') }}
        </p>
      </div>

      <div v-if="!hubBusy && echoList.length > 0 && !hasMore" class="my-6">
        <p class="text-[var(--color-text-secondary)] text-center">
          {{ t('hub.noMoreData') }}
        </p>
      </div>

      <div v-else-if="!hubBusy && echoList.length > 0 && hasMore" class="hub-load-more">
        <button type="button" :disabled="isLoading" @click="hubStore.loadEchoListPage()">
          {{ t('homeFeed.older') }}
        </button>
      </div>

    </div>

    <div
      v-if="!props.embedded"
      v-show="showBackTop"
      :style="backTopStyle"
      class="fixed bottom-6 z-50 transition-all duration-500 animate-fade-in"
    >
      <TheBackTop class="w-8 h-8 p-1" :target="props.embedded ? props.scrollTarget : null" />
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/common/BaseButton.vue'
import TheLoadingIndicator from '@/components/common/TheLoadingIndicator.vue'
import Arrow from '@/components/icons/arrow.vue'
import TheBackTop from '@/components/advanced/TheBackTop.vue'
import TheHubEcho from '@/components/advanced/echo/cards/TheHubEcho.vue'
import { onMounted, watch, computed, ref, onBeforeUnmount, nextTick } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useHubStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { useRouter, useRoute } from 'vue-router'
import { useBfCacheRestore } from '@/composables/useBfCacheRestore'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    embedded?: boolean
    scrollTarget?: HTMLElement | null
  }>(),
  {
    embedded: false,
    scrollTarget: null,
  },
)

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const currentRoute = computed(() => route.name as string)

const getButtonClasses = (routeName: string, isBackButton = false) => {
  const baseClasses = isBackButton
    ? 'text-[var(--color-text-primary)] rounded-md transition-all duration-300 border-none !shadow-none !ring-0 hover:opacity-75 p-2 group bg-transparent'
    : 'flex items-center gap-2 pl-3 py-1 rounded-md transition-all duration-300 border-none !shadow-none !ring-0 justify-start bg-transparent'

  const activeClasses =
    currentRoute.value === routeName
      ? 'text-stone-800 bg-orange-200'
      : 'text-[var(--color-text-primary)] hover:opacity-75'

  return `${baseClasses} ${activeClasses}`
}

const hubStore = useHubStore()
const { echoList, isLoading, isPreparing, hasMore, hasTriedInitialLoad } = storeToRefs(hubStore)
const hubBusy = computed(() => isLoading.value || isPreparing.value)

const mainColumn = ref<HTMLElement | null>(null)
const embeddedGridRef = ref<HTMLElement | null>(null)
const observedEmbeddedCells = new Set<HTMLElement>()
let embeddedResizeObserver: ResizeObserver | null = null
const backTopStyle = ref<Record<string, string>>({ right: '100px' })
const showBackTop = ref(false)
const HUB_SCROLL_KEY = 'hub:timeline:scrollTop'
let saveScrollTimer: number | null = null
const MASONRY_ROW_HEIGHT = 2
const MASONRY_GAP = 8

const recomputeEmbeddedSpan = (cell: HTMLElement) => {
  const content = cell.firstElementChild as HTMLElement | null
  if (!content) return
  const height = content.getBoundingClientRect().height
  if (height <= 0) return
  cell.style.gridRowEnd = `span ${Math.ceil((height + MASONRY_GAP) / (MASONRY_ROW_HEIGHT + MASONRY_GAP))}`
}

const registerEmbeddedCell = (target: Element | ComponentPublicInstance | null) => {
  if (!(target instanceof HTMLElement) || observedEmbeddedCells.has(target)) return
  observedEmbeddedCells.add(target)
  if (!embeddedResizeObserver && typeof ResizeObserver !== 'undefined') {
    embeddedResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cell = (entry.target as HTMLElement).parentElement
        if (cell) recomputeEmbeddedSpan(cell)
      }
    })
  }
  const content = target.firstElementChild as HTMLElement | null
  if (content) embeddedResizeObserver?.observe(content)
  nextTick(() => recomputeEmbeddedSpan(target))
}

const isScrollable = (el: HTMLElement) => {
  const style = window.getComputedStyle(el)
  const ov = style.overflowY
  return ov === 'auto' || ov === 'scroll' || ov === 'overlay'
}

const getActiveScrollElement = () => {
  if (props.embedded && props.scrollTarget && isScrollable(props.scrollTarget)) {
    return props.scrollTarget
  }
  return null
}

const getScrollMetrics = () => {
  const scrollEl = getActiveScrollElement()
  if (scrollEl) {
    return {
      scrollTop: scrollEl.scrollTop,
      viewportHeight: scrollEl.clientHeight,
      fullHeight: scrollEl.scrollHeight,
    }
  }

  const docEl = document.documentElement
  const body = document.body
  return {
    scrollTop: window.scrollY || docEl.scrollTop || 0,
    viewportHeight: window.innerHeight,
    fullHeight: Math.max(docEl.scrollHeight, body.scrollHeight),
  }
}

const updateShowBackTop = () => {
  showBackTop.value = getScrollMetrics().scrollTop > 300
}

const updatePosition = () => {
  const column = mainColumn.value
  if (!column) return
  const rect = column.getBoundingClientRect?.()
  if (!rect) return

  if (props.embedded) {
    const safeLeft = Math.min(window.innerWidth - 56, rect.right + 24)
    backTopStyle.value = {
      left: `${safeLeft}px`,
    }
    return
  }

  const rightOffset = window.innerWidth - rect.right
  const safeRight = Math.max(24, rightOffset - 160)
  backTopStyle.value = {
    right: `${safeRight}px`,
  }
}

const schedulePositionUpdate = () => {
  runWithBfCacheGuard(updatePosition, 120)
}

const { runWithBfCacheGuard } = useBfCacheRestore({
  onRestore: () => {
    schedulePositionUpdate()
  },
})

// --- 触底加载（IntersectionObserver） ---
// --- 滚动位置保存（仅用于回顶按钮 + 位置恢复） ---
let scrollListenerBound = false
const onScrollForBackTop = () => {
  updateShowBackTop()

  if (saveScrollTimer !== null) window.clearTimeout(saveScrollTimer)
  saveScrollTimer = window.setTimeout(() => {
    const { scrollTop } = getScrollMetrics()
    sessionStorage.setItem(HUB_SCROLL_KEY, String(scrollTop))
    saveScrollTimer = null
  }, 120)
}

const bindScrollListenerForBackTop = () => {
  if (scrollListenerBound) return
  const scrollEl = getActiveScrollElement()
  if (scrollEl) {
    scrollEl.addEventListener('scroll', onScrollForBackTop, { passive: true })
  } else {
    window.addEventListener('scroll', onScrollForBackTop, { passive: true })
  }
  scrollListenerBound = true
}

const unbindScrollListenerForBackTop = () => {
  if (!scrollListenerBound) return
  const scrollEl = getActiveScrollElement()
  if (scrollEl) {
    scrollEl.removeEventListener('scroll', onScrollForBackTop)
  } else {
    window.removeEventListener('scroll', onScrollForBackTop)
  }
  scrollListenerBound = false
}

const restoreHubScrollPosition = () => {
  const raw = sessionStorage.getItem(HUB_SCROLL_KEY)
  if (!raw) return
  const scrollTop = Number(raw)
  if (!Number.isFinite(scrollTop) || scrollTop < 0) return
  const scrollEl = getActiveScrollElement()
  if (scrollEl) {
    scrollEl.scrollTop = scrollTop
    return
  }
  window.scrollTo({ top: scrollTop })
}

onMounted(async () => {
  schedulePositionUpdate()
  window.addEventListener('resize', schedulePositionUpdate)

  // 获取 Hub 数据
  await hubStore.prepareHubFeed()

  restoreHubScrollPosition()
  updateShowBackTop()

  bindScrollListenerForBackTop()
})

watch(
  () => props.scrollTarget,
  async () => {
    await nextTick()
    unbindScrollListenerForBackTop()
    bindScrollListenerForBackTop()
  },
)

// isLoading 恢复后重新检查哨兵是否可见（防止用户已停止滚动导致卡住）
// echoList 变化后重新设置 observer（列表增长后哨兵位置变了）
watch(
  echoList,
  () => {
    nextTick(() => {
      embeddedGridRef.value
        ?.querySelectorAll<HTMLElement>('.hub-masonry-cell')
        .forEach(recomputeEmbeddedSpan)
    })
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', schedulePositionUpdate)
  embeddedResizeObserver?.disconnect()
  embeddedResizeObserver = null
  observedEmbeddedCells.clear()
  unbindScrollListenerForBackTop()
  sessionStorage.setItem(HUB_SCROLL_KEY, String(getScrollMetrics().scrollTop))
  if (saveScrollTimer !== null) {
    window.clearTimeout(saveScrollTimer)
    saveScrollTimer = null
  }
})
</script>

<style scoped>
.hub-page--embedded {
  display: block;
  margin: 0;
  padding: 0;
}

.hub-page--embedded > div {
  margin: 0;
  padding: 0;
  max-width: none;
}

.hub-embedded-nav {
  display: flex;
  align-items: center;
  padding: 0.25rem 0.75rem 0.75rem;
}

.hub-embedded-nav__back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-bg-surface) 90%, transparent);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xs);
  font-size: 0.8125rem;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease;
}

.hub-embedded-nav__back:hover {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-bg-surface) 84%, var(--color-accent) 16%);
  border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border-subtle));
}

.hub-embedded-nav__icon {
  width: 1rem;
  height: 1rem;
  transform: rotate(180deg);
}

.hub-masonry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  grid-auto-rows: 2px;
  gap: 8px;
  width: 100%;
  padding: 0;
}

.hub-masonry-cell {
  min-width: 0;
  contain: layout paint;
  animation: hub-card-enter 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--enter-index, 0) * 45ms);
}

.hub-load-more {
  display: flex;
  justify-content: center;
  padding: 1rem 1rem 4.5rem;
}

.hub-load-more button {
  min-width: 5.75rem;
  padding: 0.42rem 0.95rem;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-bg-surface) 92%, var(--color-accent) 8%);
  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border-subtle));
  border-radius: 999px;
  font-size: 0.8125rem;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.hub-load-more button:hover {
  background: color-mix(in srgb, var(--color-bg-surface) 84%, var(--color-accent) 16%);
  transform: translateY(-1px);
}

.hub-load-more button:disabled {
  cursor: wait;
  opacity: 0.55;
}

.hub-loading-panel {
  display: flex;
  min-height: min(34rem, 100dvh);
  align-items: center;
  justify-content: center;
  padding: 6rem 1rem;
}

@keyframes hub-card-enter {
  from { opacity: 0; transform: translateY(16px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (width < 640px) {
  .hub-masonry-grid {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hub-masonry-cell { animation: none; }
}
</style>
