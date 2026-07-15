<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
  ref,
  watch,
} from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useEchoStore, useHubStore, useSettingStore, useThemeStore, useUserStore } from '@/stores'
import { fetchGetPublicComments } from '@/service/api'
import { resolveAvatarUrl } from '@/service/request/shared'
import {
  HOME_CACHE_TTL,
  HOME_COMMENTS_CACHE_KEY,
  readHomeCache,
  refreshHomeCacheInBackground,
  writeHomeCache,
} from '@/utils/home-cache'
import TheEchoCard from '@/components/advanced/echo/cards/TheEchoCard.vue'
import TheHubEcho from '@/components/advanced/echo/cards/TheHubEcho.vue'
import TheLoadingIndicator from '@/components/common/TheLoadingIndicator.vue'
import Search from '@/components/icons/search.vue'
import LightIcon from '@/components/icons/light.vue'
import DarkIcon from '@/components/icons/dark.vue'
import TreeIcon from '@/components/icons/tree.vue'
import Auth from '@/components/icons/auth.vue'
import Home from '@/components/icons/home.vue'
import Hub from '@/components/icons/hub.vue'
import Setting from '@/components/icons/setting.vue'
import Signoff from '@/components/icons/signoff.vue'
import Github from '@/components/icons/github.vue'
import TheLocaleToggle from '@/components/common/TheLocaleToggle.vue'
import TheHeatMap from '@/components/advanced/widget/TheHeatMap.vue'
import TheRecentCard from '@/components/advanced/widget/TheRecentCard.vue'
import TheConnectWidget from '@/components/advanced/widget/TheConnectWidget.vue'
import TheActivityLog from '@/components/advanced/widget/TheActivityLog.vue'

const emit = defineEmits<{
  'open-palette': []
  'open-chat': []
}>()

const props = defineProps<{
  exploreMode?: boolean
  scrollTarget?: HTMLElement | null
}>()

const { t } = useI18n()
const router = useRouter()
const echoStore = useEchoStore()
const hubStore = useHubStore()
const settingStore = useSettingStore()
const themeStore = useThemeStore()
const userStore = useUserStore()
const { SystemSetting } = storeToRefs(settingStore)
const {
  echoList: hubEchoList,
  isLoading: hubIsLoading,
  isPreparing: hubIsPreparing,
  hasMore: hubHasMore,
  hasTriedInitialLoad: hubHasTriedInitialLoad,
} = storeToRefs(hubStore)

const siteName = computed(() => String(SystemSetting.value.server_name || 'Ech0'))
const siteLogo = computed(() => resolveAvatarUrl(SystemSetting.value.server_logo))
const siteTitle = computed(() => SystemSetting.value.site_title)
const siteFooterContent = computed(() => SystemSetting.value.footer_content)
const canLoadMore = computed(() =>
  props.exploreMode ? hubHasMore.value : echoStore.currentPage < echoStore.totalPages,
)
const commentsByEcho = ref(new Map<string, App.Api.Comment.CommentItem[]>())
const hasLoadedCommentPreviews = ref(false)
const projectUrl = 'https://github.com/LiuShen-Fork/Ech0'
const siteFooterHref = computed(() => SystemSetting.value.footer_link)
const isLoadingMore = ref(false)
const isHomeInitialLoading = ref(false)
const isHubBusy = computed(() => hubIsLoading.value || hubIsPreparing.value)
const shouldShowFullInitialLoading = computed(
  () => !props.exploreMode && isHomeInitialLoading.value && echoStore.echoList.length === 0,
)
const shouldShowHubInlineLoading = computed(
  () => props.exploreMode && isHubBusy.value && hubEchoList.value.length === 0,
)
const nextThemeMode = computed(() => {
  if (themeStore.mode === 'light') return 'sunny'
  if (themeStore.mode === 'sunny') return 'dark'
  return 'light'
})
const themeIcon = computed(() => {
  if (nextThemeMode.value === 'light') return LightIcon
  if (nextThemeMode.value === 'dark') return DarkIcon
  return TreeIcon
})
const nextThemeModeLabel = computed(() => {
  if (nextThemeMode.value === 'light') return String(t('homeNav.themeLight'))
  if (nextThemeMode.value === 'dark') return String(t('homeNav.themeDark'))
  return String(t('homeNav.themeSunny'))
})
type CommentsCachePayload = {
  comments: App.Api.Comment.CommentItem[]
}

type FeedItem =
  | {
      key: string
      type: 'site' | 'ai-summary' | 'heatmap' | 'connect' | 'activity'
      enterIndex: number
    }
  | { key: string; type: 'echo'; echo: App.Api.Ech0.Echo; echoIndex: number; enterIndex: number }
  | { key: string; type: 'hub-echo'; echo: App.Api.Hub.Echo; echoIndex: number; enterIndex: number }

type RawFeedItem =
  | { key: string; type: 'site' | 'ai-summary' | 'heatmap' | 'connect' | 'activity' }
  | { key: string; type: 'echo'; echo: App.Api.Ech0.Echo; echoIndex: number }
  | { key: string; type: 'hub-echo'; echo: App.Api.Hub.Echo; echoIndex: number }

const enterOrderByKey = new Map<string, number>()
const staggerFeedItems = (items: RawFeedItem[]): FeedItem[] => {
  let newItemIndex = 0
  return items.map((item) => {
    const existing = enterOrderByKey.get(item.key)
    if (existing !== undefined) return { ...item, enterIndex: existing } as FeedItem

    const enterIndex = Math.min(newItemIndex, 24)
    newItemIndex += 1
    enterOrderByKey.set(item.key, enterIndex)
    return { ...item, enterIndex } as FeedItem
  })
}

const createStableStatusSlots = (seedText: string) => {
  let seed = 2166136261
  for (const char of seedText) {
    seed ^= char.codePointAt(0) ?? 0
    seed = Math.imul(seed, 16777619)
  }
  const positions = Array.from({ length: 13 }, (_, index) => index + 3)
  for (let index = positions.length - 1; index > 0; index -= 1) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822519)
    const target = Math.abs(seed) % (index + 1)
    const current = positions[index]
    positions[index] = positions[target] ?? current
    positions[target] = current
  }
  return positions.slice(0, 3)
}

const statusSlots = computed(() => createStableStatusSlots(siteName.value))
const activeEchoList = computed(() => (props.exploreMode ? hubEchoList.value : echoStore.echoList))

const feedItems = computed<FeedItem[]>(() => {
  const fixed = new Map<number, RawFeedItem>([
    [1, { key: 'site', type: 'site' }],
    [2, { key: 'ai-summary', type: 'ai-summary' }],
    [statusSlots.value[0] ?? 4, { key: 'heatmap', type: 'heatmap' }],
    [statusSlots.value[1] ?? 7, { key: 'connect', type: 'connect' }],
    [statusSlots.value[2] ?? 11, { key: 'activity', type: 'activity' }],
  ])
  const result: RawFeedItem[] = []
  let echoIndex = 0
  let position = 1

  while (echoIndex < activeEchoList.value.length || fixed.has(position)) {
    const status = fixed.get(position)
    if (status) result.push(status)
    else {
      const echo = activeEchoList.value[echoIndex]
      if (echo) {
        if (props.exploreMode) {
          const hubEcho = echo as App.Api.Hub.Echo
          result.push({
            key: `hub-echo-${hubEcho.virtual_key}`,
            type: 'hub-echo',
            echo: hubEcho,
            echoIndex,
          })
        } else {
          result.push({
            key: `echo-${echo.id}`,
            type: 'echo',
            echo: echo as App.Api.Ech0.Echo,
            echoIndex,
          })
        }
      }
      echoIndex += 1
    }
    position += 1
  }
  return staggerFeedItems(result)
})

const gridRef = ref<HTMLElement | null>(null)
const observedCells = new Set<HTMLElement>()
const pendingCells = new Set<HTMLElement>()
let resizeObserver: ResizeObserver | null = null
let resizeFrame: number | null = null

const ROW_HEIGHT = 2
const ROW_GAP = 8
const ROW_SAFETY_GAP = 2
const DESKTOP_PAGE_SIZE = 50
const COMPACT_PAGE_SIZE = 20

const recomputeSpan = (cell: HTMLElement) => {
  const content = cell.firstElementChild as HTMLElement | null
  if (!content) return
  const height = content.offsetHeight
  if (height <= 0) return
  const nextGridRowEnd = `span ${Math.ceil((height + ROW_GAP + ROW_SAFETY_GAP) / ROW_HEIGHT)}`
  if (cell.style.gridRowEnd === nextGridRowEnd) return
  cell.style.gridRowEnd = nextGridRowEnd
}

const flushPendingSpans = () => {
  resizeFrame = null
  const cells = Array.from(pendingCells)
  pendingCells.clear()
  cells.forEach(recomputeSpan)
}

const scheduleRecompute = (cell: HTMLElement) => {
  pendingCells.add(cell)
  if (resizeFrame !== null) return
  resizeFrame = window.requestAnimationFrame(flushPendingSpans)
}

const resetResizeObserver = () => {
  resizeObserver?.disconnect()
  resizeObserver = null
  observedCells.clear()
  pendingCells.clear()
  if (resizeFrame !== null) {
    window.cancelAnimationFrame(resizeFrame)
    resizeFrame = null
  }
}

const syncPageSize = () => {
  const nextPageSize = window.matchMedia('(max-width: 639px)').matches
    ? COMPACT_PAGE_SIZE
    : DESKTOP_PAGE_SIZE
  if (echoStore.pageSize !== nextPageSize) {
    echoStore.pageSize = nextPageSize
    echoStore.currentPage = 1
  }
}

const ensureResizeObserver = () => {
  if (resizeObserver || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cell = (entry.target as HTMLElement).parentElement
      if (cell) scheduleRecompute(cell)
    }
  })
}

const registerCell = (target: Element | ComponentPublicInstance | null) => {
  if (!(target instanceof HTMLElement) || observedCells.has(target)) return
  const cell = target
  observedCells.add(cell)
  ensureResizeObserver()
  const content = cell.firstElementChild as HTMLElement | null
  if (content) resizeObserver?.observe(content)
  nextTick(() => scheduleRecompute(cell))
}

const refresh = async () => {
  if (props.exploreMode) {
    await ensureHubFeedReady({ force: true })
    return
  }
  await echoStore.refreshEchos()
  await loadCommentPreviews({ force: true })
}
const loadMore = async () => {
  if (isLoadingMore.value || !canLoadMore.value) return
  if (props.exploreMode && isHubBusy.value) return
  if (!props.exploreMode && echoStore.isLoading) return

  isLoadingMore.value = true
  try {
    if (props.exploreMode) await hubStore.loadEchoListPage()
    else await echoStore.loadNextPage()
  } finally {
    isLoadingMore.value = false
  }
}

const applyCommentPreviews = (comments: App.Api.Comment.CommentItem[]) => {
  const grouped = new Map<string, App.Api.Comment.CommentItem[]>()
  for (const comment of comments) {
    const current = grouped.get(comment.echo_id) ?? []
    if (current.length < 5) current.push(comment)
    grouped.set(comment.echo_id, current)
  }
  commentsByEcho.value = grouped
  hasLoadedCommentPreviews.value = true
}

const loadCommentPreviews = async (options: { force?: boolean } = {}) => {
  const fetchCommentsPayload = async (): Promise<CommentsCachePayload | null> => {
    const res = await fetchGetPublicComments(100)
    if (res.code !== 1) return null
    return { comments: res.data ?? [] }
  }

  const cached = options.force ? null : readHomeCache<CommentsCachePayload>(HOME_COMMENTS_CACHE_KEY)
  if (cached) {
    applyCommentPreviews(cached.data.comments)
    if (!cached.fresh) {
      void refreshHomeCacheInBackground(HOME_COMMENTS_CACHE_KEY, HOME_CACHE_TTL, fetchCommentsPayload)
    }
    return
  }

  const payload = await fetchCommentsPayload()
  if (!payload) return
  writeHomeCache(HOME_COMMENTS_CACHE_KEY, payload, HOME_CACHE_TTL)
  applyCommentPreviews(payload.comments)
}

const openHub = () => {
  if (props.exploreMode) {
    router.push({ name: 'home' })
    return
  }
  router.push({ name: 'home', query: { tab: 'hub' } })
}

const openPanel = () => {
  router.push({ name: 'panel-setting' })
}

const openAuth = () => {
  router.push({ name: 'auth' })
}

const handleLogout = async () => {
  await userStore.logout()
  await router.push({ name: 'home' })
}

const ensureHubFeedReady = async (options: { force?: boolean } = {}) => {
  if (!options.force && (hubEchoList.value.length > 0 || isHubBusy.value)) return
  await hubStore.prepareHubFeed(options)
}

const ensureHomeFeedReady = async (options: { force?: boolean } = {}) => {
  if (!options.force && isHomeInitialLoading.value) return

  const shouldLoadEchos = options.force || echoStore.echoList.length === 0
  const shouldLoadComments = options.force || !hasLoadedCommentPreviews.value
  if (!shouldLoadEchos && !shouldLoadComments) return

  if (shouldLoadEchos) isHomeInitialLoading.value = true
  try {
    await Promise.all([
      shouldLoadEchos ? echoStore.fetchCurrentPage(options) : Promise.resolve(),
      shouldLoadComments ? loadCommentPreviews(options) : Promise.resolve(),
    ])
  } finally {
    if (shouldLoadEchos) isHomeInitialLoading.value = false
  }
}

watch(
  () => echoStore.isFilteringMode,
  () => {
    if (props.exploreMode) return
    enterOrderByKey.clear()
    echoStore.refreshEchos()
  },
)

watch(
  () => props.exploreMode,
  async (enabled, wasEnabled) => {
    enterOrderByKey.clear()
    resetResizeObserver()
    await nextTick()
    if (enabled) {
      void ensureHubFeedReady()
      return
    }
    if (wasEnabled) {
      void ensureHomeFeedReady()
    }
  },
)

onMounted(async () => {
  enterOrderByKey.clear()
  syncPageSize()
  if (props.exploreMode) {
    await ensureHubFeedReady()
    return
  }
  echoStore.currentPage = 1
  await ensureHomeFeedReady()
})

onBeforeUpdate(() => {
  resetResizeObserver()
})

onUpdated(() => {
  gridRef.value?.querySelectorAll<HTMLElement>(':scope > .masonry-cell').forEach((cell) => {
    registerCell(cell)
  })
})

onBeforeUnmount(() => {
  resetResizeObserver()
})
</script>

<template>
  <section class="home-masonry-feed">
    <div v-if="shouldShowFullInitialLoading" class="feed-loading-panel">
      <TheLoadingIndicator size="lg" :label="t('homeFeed.loading')" />
    </div>

    <div v-else ref="gridRef" class="masonry-grid">
      <div
        v-for="item in feedItems"
        :key="item.key"
        :ref="registerCell"
        class="masonry-cell"
        :class="`masonry-cell--${item.type}`"
        :style="{ '--enter-index': item.enterIndex }"
      >
        <article v-if="item.type === 'site'" class="site-card">
          <div class="site-card__corner-actions">
            <button
              type="button"
              :aria-label="t('homeNav.themeToggleTitle', { mode: nextThemeModeLabel })"
              @click="themeStore.toggleTheme"
            >
              <component :is="themeIcon" />
            </button>
            <TheLocaleToggle class="site-card__locale" />
          </div>
          <header class="site-card__identity">
            <img :src="siteLogo" :alt="siteName" class="site-card__avatar" />
            <h1 class="site-card__title">{{ siteName }}</h1>
            <p v-if="siteTitle" class="site-card__intro">{{ siteTitle }}</p>
          </header>
          <div class="site-card__actions">
            <button type="button" :aria-label="t('homeHeader.searchTitle')" @click="emit('open-palette')">
              <Search />
            </button>
            <button
              type="button"
              :aria-label="exploreMode ? t('commonNav.backHome') : t('homeSidebar.plaza')"
              @click="openHub"
            >
              <Home v-if="exploreMode" />
              <Hub v-else />
            </button>
            <button v-if="userStore.isLogin" type="button" :aria-label="t('homeSidebar.panel')" @click="openPanel">
              <Setting />
            </button>
            <button
              v-if="!userStore.isLogin"
              type="button"
              :aria-label="t('auth.login')"
              @click="openAuth"
            >
              <Auth />
            </button>
            <button v-else type="button" :aria-label="t('panelPage.logout')" @click="handleLogout">
              <Signoff />
            </button>
          </div>
          <footer class="site-card__footer">
            <a
              v-if="siteFooterHref && siteFooterContent"
              :href="siteFooterHref"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ siteFooterContent }}
            </a>
            <span v-else>{{ siteFooterContent || '\u00a0' }}</span>
            <a :href="projectUrl" target="_blank" rel="noopener noreferrer" class="site-card__github">
              <Github />
              <span>Liu-Ech0</span>
            </a>
          </footer>
        </article>
        <div v-else-if="item.type === 'ai-summary'" class="status-card status-card--recent">
          <TheRecentCard />
        </div>
        <div v-else-if="item.type === 'heatmap'" class="status-card status-card--heatmap">
          <TheHeatMap />
        </div>
        <div v-else-if="item.type === 'connect'" class="status-card status-card--connect">
          <TheConnectWidget />
        </div>
        <div v-else-if="item.type === 'activity'" class="status-card status-card--activity">
          <TheActivityLog />
        </div>
        <TheEchoCard
          v-else-if="item.type === 'echo'"
          :echo="item.echo"
          :index="item.echoIndex"
          :comments="commentsByEcho.get(item.echo.id)"
          variant="masonry"
          @refresh="refresh"
        />
        <TheHubEcho
          v-else-if="item.type === 'hub-echo'"
          :echo="item.echo"
        />
      </div>
    </div>

    <div v-if="shouldShowHubInlineLoading" class="feed-status feed-status--inline-loading" role="status" aria-live="polite">
      <span class="feed-pager__spinner" aria-hidden="true"></span>
      <span>{{ t('homeFeed.loading') }}</span>
    </div>
    <div
      v-else-if="!shouldShowFullInitialLoading && !exploreMode && echoStore.total === 0"
      class="feed-status"
    >
      {{ echoStore.isFilteringMode ? t('homeFeed.noMoreFiltered') : t('homeFeed.noMore') }}
    </div>
    <div
      v-else-if="!shouldShowFullInitialLoading && exploreMode && hubEchoList.length === 0 && hubHasTriedInitialLoad"
      class="feed-status"
    >
      {{ t('hub.emptyConnectHint') }}
    </div>
    <div
      v-else-if="!shouldShowFullInitialLoading && exploreMode && hubEchoList.length > 0 && !canLoadMore"
      class="feed-status"
    >
      {{ t('hub.noMoreData') }}
    </div>
    <nav
      v-else-if="!shouldShowFullInitialLoading && !shouldShowHubInlineLoading && (canLoadMore || isLoadingMore)"
      class="feed-pager"
      :aria-label="t('homeFeed.loading')"
    >
      <div v-if="isLoadingMore" class="feed-pager__loading" role="status" aria-live="polite">
        <span class="feed-pager__spinner" aria-hidden="true"></span>
        <span>{{ t('homeFeed.loading') }}</span>
      </div>
      <button v-else type="button" class="feed-pager__primary" @click="loadMore">
        {{ t('homeFeed.older') }}
      </button>
    </nav>
  </section>
</template>

<style scoped>
.home-masonry-feed {
  width: 100%;
  min-height: 100dvh;
  padding: 0 0 4.5rem;
  background: var(--color-bg-canvas);
}

.masonry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  grid-auto-flow: row;
  grid-auto-rows: 2px;
  align-items: start;
  column-gap: 8px;
  row-gap: 0;
  width: 100%;
  padding: 0;
}

.feed-loading-panel {
  display: flex;
  min-height: min(34rem, 100dvh);
  align-items: center;
  justify-content: center;
  padding: 6rem 1rem;
}

.masonry-cell {
  min-width: 0;
  animation: card-enter 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--enter-index, 0) * 65ms);
}

.site-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 15rem;
  padding: 1.25rem;
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--color-bg-surface) 94%, var(--color-accent) 6%);
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgb(0 0 0 / 6%);
}

.site-card__corner-actions {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.site-card__corner-actions > button,
.site-card__corner-actions :deep(.locale-toggle__trigger) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0.2rem;
  color: var(--color-text-muted);
  background: transparent;
  border: 0;
  border-radius: var(--radius-xs);
  transition:
    color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.site-card__corner-actions > button:hover,
.site-card__corner-actions :deep(.locale-toggle__trigger:hover) {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 9%, transparent);
  transform: translateY(-1px);
}

.site-card__corner-actions > button :deep(svg),
.site-card__corner-actions :deep(.locale-toggle__trigger svg) {
  width: 0.95rem;
  height: 0.95rem;
}

.site-card__locale {
  transform: scale(0.9);
  transform-origin: left center;
}

.site-card__corner-actions :deep(.locale-toggle__menu) {
  top: calc(100% + 0.35rem);
  left: 0;
  right: auto;
  z-index: 20;
  min-width: 7.75rem;
  padding: 0.3rem;
  background: color-mix(in srgb, var(--color-bg-surface) 96%, transparent);
  border-color: var(--color-border-subtle);
  box-shadow: 0 12px 30px rgb(0 0 0 / 10%);
  backdrop-filter: blur(12px);
}

.site-card__corner-actions :deep(.locale-toggle__item) {
  min-height: 1.9rem;
  padding: 0.35rem 0.45rem;
  border-radius: var(--radius-xs);
  font-size: 0.78rem;
}

.status-card {
  min-height: 0;
  padding: 0.8rem 0;
  overflow: hidden;
  color: var(--color-text-secondary);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-accent) 5%, transparent),
      transparent 38%
    ),
    color-mix(in srgb, var(--color-bg-surface) 92%, var(--color-bg-muted) 8%);
  border: 1px solid color-mix(in srgb, var(--color-border-subtle) 78%, transparent);
  border-radius: 8px;
  box-shadow: 0 6px 18px rgb(0 0 0 / 4%);
}

.status-card :deep(.widget) {
  padding: 0.65rem !important;
}

.status-card :deep(.recent-title),
.status-card :deep(.connect-title),
.status-card :deep(.activity-title) {
  font-family: var(--font-family-display) !important;
  font-size: 0.82rem !important;
  font-weight: 600 !important;
  letter-spacing: 0.08em;
  color: var(--color-text-muted) !important;
  text-transform: uppercase;
}

.status-card :deep(.recent-title-accent),
.status-card :deep(.connect-title-accent),
.status-card :deep(.activity-title-accent) {
  display: none;
}

.status-card :deep(.activity-chip) {
  border-style: solid !important;
  transform: none !important;
  background: color-mix(in srgb, var(--color-bg-surface) 86%, transparent);
  letter-spacing: 0.08em !important;
}

.status-card :deep(.recent-card) {
  border-style: solid;
}

.status-card :deep(.line-chart-line) {
  stroke-width: 2.2;
}

.status-card :deep(.line-chart-fill) {
  opacity: 0.22;
}

.status-card :deep(.widget) {
  max-width: none;
}

.status-card--activity {
  padding: 1rem;
}

.site-card__identity {
  display: flex;
  min-height: 8rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.875rem;
  text-align: center;
}

.site-card__avatar {
  width: 4.5rem;
  height: 4.5rem;
  flex: 0 0 auto;
  object-fit: cover;
  border-radius: 50%;
  box-shadow:
    0 0 0 3px var(--color-bg-surface),
    0 12px 30px rgb(0 0 0 / 8%);
}

.site-card__title {
  overflow-wrap: anywhere;
  font-family: var(--font-family-display);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
}

.site-card__intro {
  max-width: 18rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  line-height: 1.65;
}

.site-card__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.55rem;
  margin-top: 1.1rem;
}

.site-card__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-xs);
  transition: transform 180ms ease, color 180ms ease, background-color 180ms ease;
}

.site-card__actions button :deep(svg) {
  width: 1.1rem;
  height: 1.1rem;
}

.site-card__actions button:hover {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 9%, transparent);
  transform: translateY(-2px);
}

.site-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.25rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--color-border-subtle);
  color: var(--color-text-muted);
  font-size: 0.72rem;
  line-height: 1.4;
}

.site-card__footer a {
  flex: 0 0 auto;
  color: var(--color-text-secondary);
  text-decoration: none;
}

.site-card__footer a:hover {
  color: var(--color-accent);
}

.site-card__github {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.site-card__github :deep(svg) {
  width: 0.85rem;
  height: 0.85rem;
}

.feed-status,
.feed-pager {
  margin-top: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 4rem;
  padding: 1rem;
  color: var(--color-text-muted);
}

.feed-pager button {
  min-width: 5.75rem;
  padding: 0.42rem 0.95rem;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-bg-surface) 92%, var(--color-accent) 8%);
  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border-subtle));
  border-radius: 999px;
  font-size: 0.8125rem;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.feed-pager button:hover {
  background: color-mix(in srgb, var(--color-bg-surface) 84%, var(--color-accent) 16%);
  transform: translateY(-1px);
}

.feed-pager__loading {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.feed-status--inline-loading {
  min-height: 3.25rem;
  font-size: 0.8125rem;
}

.feed-pager__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid color-mix(in srgb, var(--color-accent) 22%, transparent);
  border-top-color: var(--color-accent);
  border-radius: 999px;
  animation: feed-spinner 720ms linear infinite;
}

@keyframes feed-spinner {
  to { transform: rotate(360deg); }
}

@keyframes card-enter {
  from { opacity: 0; transform: translateY(16px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (width < 640px) {
  .masonry-grid {
    grid-template-columns: 1fr;
    column-gap: 8px;
    row-gap: 0;
    padding: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .masonry-cell { animation: none; }

  .feed-pager__spinner { animation: none; }
}
</style>
