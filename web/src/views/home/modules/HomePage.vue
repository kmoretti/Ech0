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
          @clear-date="selectedDate = null"
          @load-more="loadMoreEchoes"
        />
      </template>

      <div v-else class="wall-tab">
        <div ref="tabScrollEl" class="wall-tab__sheet">
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
        :calendar-open="calendarOpen"
        @update:selected-date="handleSelectDate"
        @open-tab="handleTab"
        @open-settings="openSettings"
        @open-search="paletteOpen = true"
        @open-chat="chatLauncherOpen = true"
        @toggle-calendar="calendarOpen = !calendarOpen"
      />
    </template>
  </TheWallShell>

  <TheEchoLightbox v-model="activeEcho" :origin-rect="activeRect" @view-detail="goDetail" />
  <TheCommandPalette v-model="paletteOpen" />
  <TheChatLauncher v-model="chatLauncherOpen" />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useEchoStore, useUserStore, useSettingStore, useConnectStore } from '@/stores'
import { wallDayKey, wallEchoTime, type WallEcho } from '@/utils/wall'
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

const paletteOpen = ref(false)
const chatLauncherOpen = ref(false)
const calendarOpen = ref(false)
const selectedDate = ref<string | null>(null)
const activeEcho = ref<WallEcho | null>(null)
const activeRect = ref<{ left: number; top: number; width: number; height: number } | null>(null)
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
  if (value) calendarOpen.value = false
}

const openEcho = ({ echo, rect }: { echo: WallEcho; rect: DOMRect }) => {
  activeEcho.value = echo
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
  width: 100%;
  height: 100%;
  min-height: 0;
}

.wall-tab__sheet {
  width: min(100%, 50rem);
  height: 100%;
  padding: 1.2rem 1.35rem;
  overflow-y: auto;
  scrollbar-width: none;
  background-color: color-mix(in srgb, var(--color-bg-surface) 94%, transparent);
  border: 1px solid rgb(92 72 48 / 24%);
  border-radius: 2px 14px 2px 2px;
  box-shadow:
    0 1px 0 rgb(255 255 255 / 32%),
    0 30px 60px -40px rgb(14 8 3 / 70%);
  transform: rotate(-0.16deg);
}

.wall-tab__sheet::-webkit-scrollbar {
  display: none;
}

@media (width <= 1079px) {
  .wall-tab__sheet {
    height: auto;
    max-height: none;
    padding: 1rem;
  }
}
</style>
