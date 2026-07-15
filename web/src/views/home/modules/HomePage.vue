<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="home-page">
    <div
      class="home-shell"
      :class="{
        'home-shell--feed': activeTab === 'home' || activeTab === 'hub',
        'home-shell--workspace': activeTab === 'publish',
        'home-shell--publish': activeTab === 'publish',
      }"
    >
      <div class="home-layout">
        <div
          ref="mainColumn"
          class="home-main"
          :class="{ 'home-main--unclipped': false }"
        >
          <div class="home-main-track">
            <div
              v-if="activeTab === 'publish'"
              class="home-content-block home-content-block--publish"
            >
              <section class="publish-surface">
                <header class="publish-surface__header">
                  <button
                    type="button"
                    class="publish-surface__back"
                    :aria-label="t('commonNav.backHome')"
                    @click="goHome"
                  >
                    <Back class="publish-surface__back-icon" />
                    <span>{{ t('commonNav.backHome') }}</span>
                  </button>
                  <div class="publish-surface__title-wrap">
                    <p class="publish-surface__eyebrow">
                      {{ isUpdateMode ? t('editor.updateEcho') : t('editor.publishEcho') }}
                    </p>
                    <h1 class="publish-surface__title">
                      {{ isUpdateMode ? t('editor.updateEcho') : t('editor.publishEcho') }}
                    </h1>
                  </div>
                </header>
                <TheEditor />
              </section>
            </div>
            <template v-else>
              <TheEchos
                :explore-mode="activeTab === 'hub'"
                :scroll-target="mainColumn"
                @open-palette="paletteOpen = true"
                @open-chat="openGlobalChat"
              />
            </template>
          </div>
        </div>

        <aside v-if="activeTab !== 'publish'" class="home-aside home-aside--rail">
          <HomeSidebarNav />
          <div class="home-aside__filter-block">
            <TheFilter
              show-chat-trigger
              @open-palette="paletteOpen = true"
              @open-chat="openGlobalChat"
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
  </div>
</template>

<script setup lang="ts">
import HomeSidebarNav from './HomeSidebarNav.vue'
import TheFilter from './TheFilter.vue'
import TheEchos from './TheEchos.vue'
import TheCommandPalette from './TheCommandPalette.vue'
import Back from '@/components/icons/back.vue'
import { defineAsyncComponent, onMounted, ref, onBeforeUnmount, computed, watch } from 'vue'
import { useEchoStore, useUserStore, useSettingStore, useEditorStore } from '@/stores'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const TheEditor = defineAsyncComponent(() => import('./TheEditor.vue'))

const userStore = useUserStore()
const settingStore = useSettingStore()
const echoStore = useEchoStore()
const editorStore = useEditorStore()
const { isLogin } = storeToRefs(userStore)
const { isUpdateMode } = storeToRefs(editorStore)
const { t } = useI18n()
const activeTab = computed<'home' | 'publish' | 'hub'>(() => {
  if (route.query.tab === 'publish' && isLogin.value) return 'publish'
  if (route.query.tab === 'hub') return 'hub'
  return 'home'
})
const mainColumn = ref<HTMLElement | null>(null)
const TIMELINE_SCROLL_KEY = 'home:timeline:scrollTop'
const WINDOW_SCROLL_KEY = 'home:window:scrollTop'
let timelineScrollRaf: number | null = null
let windowScrollRaf: number | null = null

const paletteOpen = ref<boolean>(false)
const openGlobalChat = () => window.dispatchEvent(new Event('ech0:open-chat'))
const goHome = () => router.push({ name: 'home' })
// 对话入口：仅登录且 Agent 已开启时可用，与原侧边栏入口的可见条件保持一致
const chatAvailable = computed(() => isLogin.value && settingStore.AgentSetting.enable)

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
    openGlobalChat()
    return
  }
  if (event.key === 'Escape') {
    if (paletteOpen.value) paletteOpen.value = false
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
  // 等首批 echo 渲染后再恢复滚动位置，否则容器高度还没撑开，scrollTop 会被夹到 0。
  let stopScrollRestoreWatch: (() => void) | null = null
  stopScrollRestoreWatch = watch(
    () => echoStore.echoList.length > 0 && !echoStore.isLoading,
    (ready) => {
      if (!ready) return
      stopScrollRestoreWatch?.()
      stopScrollRestoreWatch = null
      window.requestAnimationFrame(() => {
        restoreTimelineScrollPosition()
      })
    },
    { immediate: true, flush: 'post' },
  )
  window.addEventListener('keydown', handleGlobalKeydown)
  prefetchHeavyChunks()
})

onBeforeUnmount(() => {
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
  --home-canvas: var(--color-bg-canvas, #f5f3ef);
  --home-accent: #e07020;
  --home-main-max: 28rem;

  min-height: 100dvh;
  background: var(--home-canvas);
  color: var(--color-text-primary);
}

@media (width >= 820px) {
  .home-page {
    min-height: 100dvh;
  }
}

@media (width >= 820px) {
  .home-shell--feed {
    margin: 0;
    padding: 8px;
  }

  .home-shell--feed .home-layout {
    display: block;
  }

  .home-shell--feed .home-main {
    max-width: none;
    padding: 0;
    overflow-y: visible;
    flex: 1 1 auto;
  }

  .home-shell--feed .home-main-track {
    max-width: none;
  }
}

.home-shell {
  max-width: 50rem;
  margin: 1rem auto 2.5rem;
  padding: 0 0.75rem;
}

.home-shell--feed {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 8px;
}

.home-shell.home-shell--feed {
  padding: 8px;
}

.home-shell--feed .home-layout,
.home-shell--feed .home-main,
.home-shell--feed .home-main-track {
  width: 100%;
  max-width: none;
}

.home-shell--feed .home-main-track > :not(.home-aside--mobile):not(.home-masonry-feed):not(.hub-page--embedded) {
  display: none;
}

.home-shell--feed .home-aside--rail {
  display: none;
}

.home-shell--workspace {
  width: min(100%, 72rem);
  max-width: none;
}

.home-shell--workspace .home-main-track {
  max-width: 52rem;
}

.home-shell--publish .home-main-track {
  max-width: 46rem;
}

.home-shell--publish {
  width: min(100%, 48rem);
}

.home-shell--publish .home-layout {
  justify-content: center;
}

.home-shell--publish .home-main {
  max-width: none;
  flex-basis: 100%;
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
    min-height: 100dvh;
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
  overflow-x: hidden;
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

  .home-shell--feed .home-main {
    min-height: 100dvh;
    overflow-y: visible;
    scrollbar-gutter: auto;
    overscroll-behavior: auto;
  }

  .home-main--unclipped {
    overflow: hidden auto;
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
  padding-block: 8px 4rem;
}

.publish-surface {
  width: 100%;
  overflow: visible;
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-bg-surface) 96%, transparent);
  box-shadow: 0 10px 30px rgb(0 0 0 / 6%);
}

.publish-surface__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.publish-surface__back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  padding: 0.36rem 0.58rem;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-bg-surface) 90%, transparent);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xs);
  font-size: 0.8125rem;
  line-height: 1.2;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.publish-surface__back:hover {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-bg-surface) 84%, var(--color-accent) 16%);
  border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border-subtle));
  transform: translateY(-1px);
}

.publish-surface__back-icon {
  width: 1rem;
  height: 1rem;
}

.publish-surface__title-wrap {
  min-width: 0;
  text-align: right;
}

.publish-surface__eyebrow {
  margin: 0 0 0.1rem;
  color: var(--color-text-muted);
  font-family: var(--font-family-display);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.publish-surface__title {
  margin: 0;
  color: var(--color-text-primary);
  font-family: var(--font-family-display);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}

.publish-surface :deep(.editor-shell__inner) {
  padding: 0.65rem;
}

.publish-surface :deep(.editor-shell__body) {
  padding: 0;
  margin-bottom: 0.35rem;
}

@media (width >= 768px) {
  .home-content-block--publish {
    padding-inline: 0;
    padding-block-start: 1rem;
  }

  .publish-surface__header {
    padding: 0.9rem 1rem;
  }

  .publish-surface :deep(.editor-shell__inner) {
    padding: 0.85rem;
  }
}

@media (width >= 1024px) {
  .home-content-block--publish {
    padding-inline: 0;
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
