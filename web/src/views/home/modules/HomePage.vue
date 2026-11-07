<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <TheWallShell>
    <template #main>
      <template v-if="activeTab === 'home'">
        <TheNoteWall
          :echoes="filteredEchoes"
          :selected-date="selectedDate"
          :loading="echoLoading"
          :can-load-more="canLoadMore"
          :loading-more="echoStore.isLoading"
          @open="openEcho"
          @view-detail="goDetail"
          @clear-date="selectedDate = null"
          @load-more="loadMoreEchoes"
        />
      </template>

      <div v-else ref="tabScrollEl" class="wall-tab">
        <div class="wall-tab__sheet">
          <header v-if="activeTab !== 'tags'" class="wall-tab__head">
            <h2 class="wall-tab__title">{{ tabTitle }}</h2>
            <span class="wall-tab__rule" aria-hidden="true"></span>
          </header>
          <TheEditor v-if="activeTab === 'publish'" />
          <TheTagsManager v-else-if="activeTab === 'tags'" />
          <HubPage v-else-if="activeTab === 'hub'" embedded :scroll-target="tabScrollEl" />
        </div>
      </div>
    </template>

    <template #side>
      <TheWallRail
        :echoes="wallPool"
        :marks="marks"
        :selected-date="selectedDate"
        :latest-stamp="latestStamp"
        :active-tab="activeTab"
        :connects="connectStore.connectsInfo"
        :agent-enabled="AgentSetting.enable"
        :chat-available="chatAvailable"
        @update:selected-date="handleSelectDate"
        @open-tab="handleTab"
        @open-settings="openSettings"
        @open-search="paletteOpen = true"
        @open-chat="chatLauncherOpen = true"
      />
    </template>
  </TheWallShell>

  <TheEchoLightbox
    v-model="activeEcho"
    :origin-rect="activeRect"
    :origin-meta="activeMeta"
    @view-detail="goDetail"
  />
  <TheCommandPalette v-model="paletteOpen" />
  <TheChatLauncher v-model="chatLauncherOpen" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useEchoStore, useUserStore, useSettingStore, useConnectStore } from '@/stores'
import { wallDayKey, wallEchoTime, type WallEcho, type WallNoteMeta } from '@/utils/wall'
import TheNoteWall from '@/components/advanced/wall/TheNoteWall.vue'
import TheWallShell from '@/components/advanced/wall/TheWallShell.vue'
import TheEchoLightbox from '@/components/advanced/wall/TheEchoLightbox.vue'
import TheWallRail from './wall/TheWallRail.vue'
import TheCommandPalette from './TheCommandPalette.vue'
import TheChatLauncher from './TheChatLauncher.vue'

const props = defineProps<{
  demoEchoes?: WallEcho[]
}>()

const TheEditor = defineAsyncComponent(() => import('./TheEditor.vue'))
const TheTagsManager = defineAsyncComponent(() => import('./TheEditor/TheTagsManager.vue'))
const HubPage = defineAsyncComponent(() => import('@/views/hub/modules/HubPage.vue'))

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingStore = useSettingStore()
const echoStore = useEchoStore()
const connectStore = useConnectStore()
const { isLogin } = storeToRefs(userStore)
const { AgentSetting } = storeToRefs(settingStore)

const isDemo = computed(() => Array.isArray(props.demoEchoes))
const activeTab = computed<'home' | 'publish' | 'tags' | 'hub'>(() => {
  if (route.query.tab === 'publish' && isLogin.value) return 'publish'
  if (route.query.tab === 'tags') return 'tags'
  if (route.query.tab === 'hub') return 'hub'
  return 'home'
})
const tabTitle = computed(() =>
  activeTab.value === 'hub' ? t('homeSidebar.plaza') : t('homeSidebar.publish'),
)

const paletteOpen = ref(false)
const chatLauncherOpen = ref(false)
const selectedDate = ref<string | null>(null)
const activeEcho = ref<WallEcho | null>(null)
const activeRect = ref<{ left: number; top: number; width: number; height: number } | null>(null)
const activeMeta = ref<WallNoteMeta | null>(null)
const tabScrollEl = ref<HTMLElement | null>(null)

const wallEchoes = computed<WallEcho[]>(() => props.demoEchoes ?? echoStore.echoList)
const sortedWallEchoes = computed(() =>
  [...wallEchoes.value].sort((a, b) => wallEchoTime(b) - wallEchoTime(a)),
)
const wallPool = computed(() => sortedWallEchoes.value)
const marks = computed(() => [...new Set(wallPool.value.map((echo) => wallDayKey(echo)))])
const latestStamp = computed(() =>
  wallPool.value[0] ? wallEchoTime(wallPool.value[0]!) : undefined,
)
const filteredEchoes = computed(() =>
  selectedDate.value
    ? wallPool.value.filter((echo) => wallDayKey(echo) === selectedDate.value)
    : wallPool.value,
)
const echoLoading = computed(
  () => !isDemo.value && echoStore.isLoading && echoStore.echoList.length === 0,
)
const chatAvailable = computed(() => isLogin.value && AgentSetting.value.enable)
const canLoadMore = computed(() => !isDemo.value && echoStore.currentPage < echoStore.totalPages)
const loadMoreEchoes = () => {
  if (!canLoadMore.value || echoStore.isLoading) return
  void echoStore.loadNextPage()
}

watch(
  () => marks.value.join('|'),
  () => {
    if (selectedDate.value && !marks.value.includes(selectedDate.value)) {
      selectedDate.value = null
    }
  },
)

const handleSelectDate = (value: string | null) => {
  selectedDate.value = value
}

const openEcho = ({ echo, rect, meta }: { echo: WallEcho; rect: DOMRect; meta: WallNoteMeta }) => {
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
  if (tab === 'publish' && !isLogin.value) {
    void router.push({ name: 'auth', query: { redirect: '/?tab=publish' } })
    return
  }
  const query = { ...route.query }
  delete query.page
  if (tab === 'home') {
    delete query.tab
  } else {
    query.tab = tab
  }
  void router.push({ name: 'home', query })
}

const openSettings = () => {
  void router.push({ name: 'panel' })
}

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
    if (activeEcho.value) activeEcho.value = null
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
  document.documentElement.classList.add('wall-mode')
  window.addEventListener('keydown', handleGlobalKeydown)

  if (!isDemo.value) {
    void echoStore.fetchCurrentPage()
    void connectStore.getConnectInfo().catch(() => undefined)
  }

  prefetchHeavyChunks()
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('wall-mode')
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<style scoped>
.wall-tab {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.35rem 0.4rem 6rem;
  overflow-y: auto;
  scrollbar-width: none;
}

.wall-tab::-webkit-scrollbar {
  display: none;
}

.wall-tab__sheet {
  --color-text-primary: #2c2620;
  --color-text-secondary: rgb(70 56 40 / 74%);
  --color-text-muted: rgb(74 62 48 / 58%);
  --color-border-subtle: rgb(92 72 48 / 20%);
  --md-editor-input-text: #2c2620;
  --md-editor-placeholder: rgb(74 62 48 / 38%);
  --md-editor-mini-bg: #fbf7ee;
  --md-editor-mini-border: rgb(92 72 48 / 20%);
  --md-editor-mini-btn-bg: #fcf9f2;
  --md-editor-mini-btn-border: rgb(92 72 48 / 20%);
  --md-editor-mini-btn-hover-bg: #f6efe2;
  --md-editor-mode-toggle-bg: #f8f4ea;
  --md-editor-mode-toggle-hover-bg: #f6efe2;
  --md-editor-actions-ring-color: rgb(92 72 48 / 16%);
  --md-editor-actions-hover-bg: #f6efe2;
  --md-editor-actions-hover-border: rgb(92 72 48 / 30%);
  --md-editor-divider-color: rgb(92 72 48 / 16%);
  --md-editor-toolbar-btn-bg: #fcf9f2;
  --md-editor-toolbar-btn-text: rgb(70 56 40 / 70%);
  --md-editor-toolbar-btn-hover-bg: #f6efe2;
  --md-editor-toolbar-btn-hover-text: #2c2620;
  --md-editor-toolbar-btn-hover-border: rgb(92 72 48 / 30%);

  width: min(100%, 44rem);
  height: auto;
  margin: 0 auto;
  padding: 1.15rem 1.35rem 1.2rem;
  color: #2c2620;
  background-color: #f7f1e5;
  background-image:
    radial-gradient(circle at 16% 4%, rgb(255 255 255 / 58%), transparent 44%),
    repeating-linear-gradient(
      to bottom,
      transparent 0 1.9rem,
      rgb(92 104 118 / 8%) 1.9rem calc(1.9rem + 1px)
    );
  border: 1px solid rgb(92 72 48 / 24%);
  border-radius: 1px;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 40%),
    0 26px 54px -38px rgb(14 8 3 / 62%);
  transform: rotate(-0.12deg);
}

.wall-tab__head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1rem;
  padding: 0.1rem 0.15rem 0;
}

.wall-tab__title {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: rgb(52 42 30 / 82%);
}

.wall-tab__rule {
  flex: 1 1 auto;
  border-top: 1px dashed rgb(92 72 48 / 24%);
}

.wall-tab__sheet :deep(.markdown-editor:not(.is-full)) {
  border-color: rgb(92 72 48 / 20%);
}

.wall-tab__sheet :deep(.editor-input) {
  font-family: var(--font-family-display);
  font-size: 0.92rem;
  line-height: 1.9;
}

@media (width <= 1079px) {
  .wall-tab {
    height: auto;
    padding: 0.2rem 0.1rem 5.5rem;
    overflow: visible;
  }

  .wall-tab__sheet {
    padding: 1rem;
  }
}
</style>
