<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="home-page">
    <div class="home-shell">
      <div class="home-layout">
        <div
          ref="mainColumn"
          class="home-main"
          :class="{ 'home-main--unclipped': activeTab === 'tags' }"
        >
          <div class="home-main-track">
            <HomeHeader class="mb-3 mx-1" />
            <aside class="home-aside home-aside--mobile">
              <HomeSidebarNav
                v-model:mobile-search-open="mobileSearchOpen"
                class="mx-1"
                @open-palette="paletteOpen = true"
                @open-chat="chatLauncherOpen = true"
              />
            </aside>
            <div
              v-if="activeTab === 'publish'"
              class="home-content-block home-content-block--publish"
            >
              <TheEditor />
            </div>
            <div v-else-if="activeTab === 'tags'" class="home-content-block">
              <TheTagsManager />
            </div>

            <template v-else-if="activeTab === 'home'">
              <HomeBanner :class="{ 'home-banner--mobile-hidden': shouldHideBannerOnMobile }" />

              <TheEchos compact :scroll-target="mainColumn" />
            </template>

            <div v-else-if="activeTab === 'status'" class="home-content-block home-status-widgets">
              <TheHeatMap />
              <TheRecentCard v-if="AgentSetting.enable" />
              <TheConnectWidget />
              <TheCommentWidget />
            </div>
            <HubPage v-else embedded :scroll-target="mainColumn" />
          </div>
        </div>

        <aside class="home-aside home-aside--rail">
          <HomeSidebarNav />
          <div class="home-aside__filter-block">
            <TheFilter
              show-chat-trigger
              @open-palette="paletteOpen = true"
              @open-chat="chatLauncherOpen = true"
            />
            <a
              href="https://github.com/lin-snow/Ech0"
              target="_blank"
              rel="noopener noreferrer"
              class="home-aside__version"
            >
              version: {{ settingStore.hello?.version || '--' }}
            </a>
          </div>
        </aside>
      </div>
    </div>
    <TheCommandPalette v-model="paletteOpen" />
    <TheChatLauncher v-model="chatLauncherOpen" />
  </div>
</template>

<script setup lang="ts">
import HomeHeader from './HomeHeader.vue'
import HomeBanner from './HomeBanner.vue'
import HomeSidebarNav from './HomeSidebarNav.vue'
import TheFilter from './TheFilter.vue'
import TheEchos from './TheEchos.vue'
import TheCommandPalette from './TheCommandPalette.vue'
import TheChatLauncher from './TheChatLauncher.vue'
import { defineAsyncComponent, onMounted, ref, onBeforeUnmount, computed, watch } from 'vue'
import { useEchoStore, useUserStore, useSettingStore, useConnectStore } from '@/stores'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  TheCommentWidget,
  TheConnectWidget,
  TheHeatMap,
  TheRecentCard,
} from '@/components/advanced/widget'

const route = useRoute()
const TheEditor = defineAsyncComponent(() => import('./TheEditor.vue'))
const TheTagsManager = defineAsyncComponent(() => import('./TheEditor/TheTagsManager.vue'))
const HubPage = defineAsyncComponent(() => import('@/views/hub/modules/HubPage.vue'))

const userStore = useUserStore()
const settingStore = useSettingStore()
const echoStore = useEchoStore()
const connectStore = useConnectStore()
const { isLogin } = storeToRefs(userStore)
const { AgentSetting } = storeToRefs(settingStore)
const { searchingMode, isFilteringMode } = storeToRefs(echoStore)
const mobileSearchOpen = ref(false)
const activeTab = computed<'home' | 'publish' | 'status' | 'tags' | 'hub'>(() => {
  if (route.query.tab === 'publish' && isLogin.value) return 'publish'
  if (route.query.tab === 'status') return 'status'
  if (route.query.tab === 'tags') return 'tags'
  if (route.query.tab === 'hub') return 'hub'
  return 'home'
})
const shouldHideBannerOnMobile = computed(
  () => mobileSearchOpen.value || searchingMode.value || isFilteringMode.value,
)

// Start the (potentially slow) connect lookup before the status widgets mount,
// so it never queues behind the AI Recent request on the status page.
watch(
  activeTab,
  (tab) => {
    if (tab === 'status') void connectStore.getConnectInfo()
  },
  { immediate: true },
)

const mainColumn = ref<HTMLElement | null>(null)
const TIMELINE_SCROLL_KEY = 'home:timeline:scrollTop'
const WINDOW_SCROLL_KEY = 'home:window:scrollTop'
let timelineScrollRaf: number | null = null
let windowScrollRaf: number | null = null
let stopScrollRestoreWatch: (() => void) | null = null
let scrollRestored = false

const paletteOpen = ref<boolean>(false)
const chatLauncherOpen = ref<boolean>(false)
const chatAvailable = computed(() => isLogin.value && AgentSetting.value.enable)

const handleGlobalKeydown = (event: KeyboardEvent) => {
  const withModifier = (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey
  const isSearchShortcut = withModifier && event.key === 'k'
  if (isSearchShortcut) {
    event.preventDefault()
    paletteOpen.value = !paletteOpen.value
    return
  }
  const isChatShortcut = withModifier && event.key === 'j'
  if (isChatShortcut && chatAvailable.value) {
    event.preventDefault()
    chatLauncherOpen.value = !chatLauncherOpen.value
    return
  }
  if (event.key === 'Escape') {
    if (paletteOpen.value) paletteOpen.value = false
    if (chatLauncherOpen.value) chatLauncherOpen.value = false
  }
}

const saveTimelineScrollPosition = () => {
  if (!mainColumn.value || timelineScrollRaf !== null) return

  timelineScrollRaf = window.requestAnimationFrame(() => {
    timelineScrollRaf = null
    if (!mainColumn.value) return
    sessionStorage.setItem(TIMELINE_SCROLL_KEY, String(mainColumn.value.scrollTop))
  })
}

const saveWindowScrollPosition = () => {
  if (windowScrollRaf !== null) return
  windowScrollRaf = window.requestAnimationFrame(() => {
    windowScrollRaf = null
    sessionStorage.setItem(WINDOW_SCROLL_KEY, String(window.scrollY))
  })
}

const restoreTimelineScrollPosition = () => {
  if (mainColumn.value) {
    const raw = sessionStorage.getItem(TIMELINE_SCROLL_KEY)
    const scrollTop = raw ? Number(raw) : 0
    if (Number.isFinite(scrollTop) && scrollTop > 0) {
      mainColumn.value.scrollTop = scrollTop
    }
  }
  const rawWindow = sessionStorage.getItem(WINDOW_SCROLL_KEY)
  const windowTop = rawWindow ? Number(rawWindow) : 0
  if (Number.isFinite(windowTop) && windowTop > 0) {
    window.scrollTo({ top: windowTop, behavior: 'auto' })
  }
}

const prefetchHeavyChunks = () => {
  const trigger = () => {
    import('@/views/echo/EchoView.vue').catch(() => {})
    import('@/editor/core/markdown').catch(() => {})
  }
  const ric = (window as Window & { requestIdleCallback?: typeof requestIdleCallback })
    .requestIdleCallback
  if (typeof ric === 'function') {
    ric(trigger, { timeout: 2000 })
  } else {
    window.setTimeout(trigger, 1500)
  }
}

onMounted(async () => {
  if (mainColumn.value) {
    mainColumn.value.scrollLeft = 0
    mainColumn.value.addEventListener('scroll', saveTimelineScrollPosition, { passive: true })
  }
  window.addEventListener('scroll', saveWindowScrollPosition, { passive: true })
  stopScrollRestoreWatch = watch(
    () => echoStore.echoList.length > 0 && !echoStore.isLoading,
    (ready) => {
      if (!ready || scrollRestored) return
      scrollRestored = true
      stopScrollRestoreWatch?.()
      window.requestAnimationFrame(() => {
        restoreTimelineScrollPosition()
      })
    },
    { immediate: true, flush: 'post' },
  )
  if (scrollRestored) stopScrollRestoreWatch()
  window.addEventListener('keydown', handleGlobalKeydown)
  prefetchHeavyChunks()
})

onBeforeUnmount(() => {
  stopScrollRestoreWatch?.()
  if (mainColumn.value) {
    mainColumn.value.removeEventListener('scroll', saveTimelineScrollPosition)
  }
  if (timelineScrollRaf !== null) {
    window.cancelAnimationFrame(timelineScrollRaf)
    timelineScrollRaf = null
  }
  if (windowScrollRaf !== null) {
    window.cancelAnimationFrame(windowScrollRaf)
    windowScrollRaf = null
  }
  window.removeEventListener('scroll', saveWindowScrollPosition)
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.home-page {
  --home-canvas: #ece9e3;
  --home-accent: #292622;
  --home-main-max: 46rem;

  /* Desk palette — paper, graphite and a single restrained brick accent. */
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
  background: transparent;
  color: var(--color-text-primary);
}

.sunny .home-page {
  --home-canvas: #f1ede5;
  --sj-canvas: #f1ede5;
  --sj-paper: #fdfbf6;
  --sj-paper-2: #f7f3ec;
  --sj-kraft: #e9e3d8;
}

.dark .home-page {
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

  background: transparent;
}

@media (width >= 820px) {
  .home-page {
    height: 100dvh;
    overflow: hidden;
  }
}

.home-shell {
  max-width: 64rem;
  margin: 1rem auto 2.5rem;
  padding: 0 0.75rem;
}

@media (width >= 640px) {
  .home-shell {
    margin-top: 1.25rem;
    margin-bottom: 2rem;
    padding: 0 1rem;
  }
}

@media (width >= 820px) {
  .home-shell {
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
}

.home-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: stretch;
  background: transparent;
}

@media (width >= 820px) {
  .home-layout {
    flex: 1;
    min-height: 0;
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
    gap: clamp(1.25rem, 4vw, 2rem);
    padding: 0;
  }
}

.home-main-track {
  width: 100%;
  max-width: var(--home-main-max);
  margin-left: auto;
  margin-right: auto;
}

.home-main {
  width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  overflow-x: visible;
}

@media (width >= 820px) {
  .home-main {
    min-height: 0;
    align-self: stretch;
    overflow-y: auto;
    scrollbar-gutter: stable;
    overscroll-behavior: contain;
    flex: 0 1 var(--home-main-max);
    max-width: var(--home-main-max);
    padding: 1.5rem 0 2rem;
  }

  .home-main--unclipped {
    overflow: visible auto;
  }
}

.home-aside {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  width: 100%;
}

.home-aside__filter-block {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.home-aside__version {
  display: inline-block;
  margin: 0;
  margin-top: 0.5rem;
  padding-inline: 0.5rem;
  font-family: var(--font-family-display);
  font-weight: 600;
  font-size: 0.75rem;
  line-height: 1.25;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s;
}

.home-aside__version:hover {
  color: var(--color-text-primary);
}

.home-content-block {
  width: 100%;
}

.home-content-block--publish {
  padding-inline: 0;
}

.home-status-widgets {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (width >= 768px) {
  .home-content-block--publish {
    padding-inline: 1.75rem;
  }
}

@media (width >= 1024px) {
  .home-content-block--publish {
    padding-inline: 2rem;
  }
}

.home-aside--mobile {
  display: flex;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
}

@media (width >= 820px) {
  .home-aside--mobile {
    display: none !important;
  }

  .home-aside--rail {
    display: flex;
    width: 14rem;
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 1.5rem;
  }
}

@media (width <= 819.98px) {
  .home-banner--mobile-hidden {
    display: none;
  }

  .home-aside--rail {
    display: none !important;
  }
}
</style>
