<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <aside class="wall-rail">
    <HomeHeader class="wall-rail__header" hide-panel>
      <template #extra-actions>
        <button
          type="button"
          class="wall-rail__head-btn"
          :aria-label="t('homeTop.searchPlaceholder')"
          :title="t('homeTop.searchPlaceholder')"
          @click="emit('open-search')"
        >
          <Search class="wall-rail__head-icon" />
        </button>
        <button
          v-if="chatAvailable"
          type="button"
          class="wall-rail__head-btn"
          :aria-label="t('chatLauncher.title')"
          :title="t('chatLauncher.title')"
          @click="emit('open-chat')"
        >
          <Chat class="wall-rail__head-icon" />
        </button>
      </template>
    </HomeHeader>

    <nav class="wall-nav" aria-label="Primary">
      <button
        type="button"
        class="wall-nav__tab wall-nav__tab--home"
        :class="{ 'is-active': activeTab === 'home' }"
        @click="emit('open-tab', 'home')"
      >
        <Home class="wall-nav__icon" />
        <span>{{ t('homeSidebar.home') }}</span>
      </button>
      <button
        type="button"
        class="wall-nav__tab wall-nav__tab--publish"
        :class="{ 'is-active': activeTab === 'publish' }"
        @click="emit('open-tab', 'publish')"
      >
        <Write class="wall-nav__icon" />
        <span>{{ t('homeSidebar.publish') }}</span>
      </button>
      <button
        type="button"
        class="wall-nav__tab wall-nav__tab--explore"
        :class="{ 'is-active': activeTab === 'hub' }"
        @click="emit('open-tab', 'hub')"
      >
        <Hub class="wall-nav__icon" />
        <span>{{ t('homeSidebar.plaza') }}</span>
      </button>
      <button
        type="button"
        class="wall-nav__tab wall-nav__tab--settings"
        @click="emit('open-settings')"
      >
        <Setting class="wall-nav__icon" />
        <span>{{ t('homeSidebar.panel') }}</span>
      </button>
    </nav>

    <div class="wall-rail__calendar">
      <TheWallCalendar
        :marks="marks"
        :selected-date="selectedDate"
        :latest-stamp="latestStamp"
        @update:selected-date="emit('update:selectedDate', $event)"
      />
    </div>

    <section class="wall-explore" aria-label="Explore">
      <header class="wall-explore__head">
        <h2 class="wall-explore__title">{{ t('wall.deskCorner') }}</h2>
        <span class="wall-explore__rule" aria-hidden="true"></span>
      </header>

      <div v-if="agentEnabled || recentText" class="wall-ai">
        <p class="wall-ai__label">{{ t('wall.aiSummary') }}</p>
        <TheRecentCard v-if="!recentText" fluid />
        <p v-else class="wall-ai__text">{{ recentText }}</p>
      </div>
      <div class="wall-connect">
        <p class="wall-connect__label">{{ t('wall.connected') }}</p>
        <ul v-if="connects.length" class="wall-connect__list">
          <li v-for="connect in connects" :key="connect.server_url">
            <a
              :href="connect.server_url"
              target="_blank"
              rel="noopener noreferrer"
              class="wall-connect__item"
            >
              <span class="wall-connect__name">{{ connect.server_name }}</span>
              <span class="wall-connect__count">{{ connect.today_echos || 0 }}</span>
            </a>
          </li>
        </ul>
        <p v-else class="wall-connect__empty">{{ t('wall.noConnects') }}</p>
      </div>
    </section>

    <TheWallFooter class="wall-rail__footer" />
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeHeader from '@/views/home/modules/HomeHeader.vue'
import TheWallCalendar from '@/components/advanced/wall/TheWallCalendar.vue'
import TheWallFooter from '@/components/advanced/wall/TheWallFooter.vue'
import { TheRecentCard } from '@/components/advanced/widget'
import Home from '@/components/icons/home.vue'
import Write from '@/components/icons/write.vue'
import Hub from '@/components/icons/hub.vue'
import Setting from '@/components/icons/setting.vue'
import Search from '@/components/icons/search.vue'
import Chat from '@/components/icons/chat.vue'
import { wallEchoTime, type WallEcho } from '@/utils/wall'

const props = defineProps<{
  echoes: WallEcho[]
  marks: string[]
  selectedDate: string | null
  latestStamp?: number
  activeTab: 'home' | 'publish' | 'tags' | 'hub'
  connects?: App.Api.Connect.Connect[]
  agentEnabled?: boolean
  chatAvailable?: boolean
  recentText?: string
}>()

const emit = defineEmits<{
  (event: 'update:selectedDate', value: string | null): void
  (event: 'open-tab', tab: 'home' | 'publish' | 'hub'): void
  (event: 'open-settings'): void
  (event: 'open-search'): void
  (event: 'open-chat'): void
}>()

const { t } = useI18n()
const connects = computed(() => props.connects ?? [])

// Keep the newest stamp in a reactive-friendly form for the calendar's first view.
const latestStamp = computed(() => {
  if (props.latestStamp && Number.isFinite(props.latestStamp)) return props.latestStamp
  const newest = props.echoes.reduce((latest, echo) => Math.max(latest, wallEchoTime(echo)), 0)
  return newest || undefined
})
</script>

<style scoped>
.wall-rail {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 0.15rem 0.1rem 1.5rem;
  overflow-y: auto;
  scrollbar-width: none;
  overscroll-behavior: contain;
}

.wall-rail::-webkit-scrollbar {
  display: none;
}

.wall-rail__header {
  flex: none;
  padding: 0 0.15rem;
}

.wall-rail :deep(.home-header) {
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.wall-rail :deep(.home-header__brand) {
  width: 100%;
}

.wall-rail :deep(.home-header__actions) {
  width: 100%;
  justify-content: flex-end;
}

.wall-rail :deep(.home-header__title) {
  color: rgb(var(--wall-ink-soft-rgb) / 92%);
  font-size: 1.05rem;
  text-shadow: 0 1px 8px rgb(0 0 0 / 25%);
}

.wall-rail :deep(.home-header__link-icon) {
  color: rgb(var(--wall-ink-soft-rgb) / 60%);
}

.wall-rail :deep(.home-header__link-icon:hover) {
  color: rgb(var(--wall-ink-soft-rgb) / 94%);
  background: rgb(var(--wall-ink-soft-rgb) / 10%);
}

.wall-rail :deep(.home-header__logo) {
  border-color: rgb(var(--wall-ink-soft-rgb) / 30%);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 18%);
}

.wall-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.38rem;
  flex: none;
}

.wall-nav__tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.48rem 0.55rem;
  border: 1px solid rgb(var(--wall-line-rgb) / 18%);
  border-radius: 1px;
  background: rgb(255 252 244 / 9%);
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: rgb(var(--wall-ink-soft-rgb) / 68%);
  text-align: left;
  cursor: pointer;
  transition:
    color 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;
}

.wall-nav__tab--home {
  transform: rotate(-0.5deg);
}

.wall-nav__tab--publish {
  transform: rotate(0.45deg);
}

.wall-nav__tab--explore {
  transform: rotate(0.35deg);
}

.wall-nav__tab--settings {
  transform: rotate(-0.35deg);
}

.wall-nav__tab:hover {
  border-color: rgb(var(--wall-line-rgb) / 34%);
  background: rgb(255 252 244 / 16%);
  color: rgb(var(--wall-ink-soft-rgb) / 96%);
  transform: rotate(0deg) translateY(-1px);
}

.wall-nav__tab.is-active {
  border-color: rgb(var(--wall-line-rgb) / 40%);
  background: rgb(var(--wall-chip-bg-rgb) / 92%);
  color: var(--wall-ink-strong);
  box-shadow: 0 6px 14px -12px rgb(0 0 0 / 60%);
  transform: rotate(0deg);
}

.wall-nav__tab.is-active::after {
  content: '';
  position: absolute;
  top: 0.34rem;
  right: 0.34rem;
  width: 0.24rem;
  height: 0.24rem;
  border-radius: 50%;
  background: rgb(var(--wall-accent-rgb));
}

.wall-nav__tab:focus-visible {
  outline: 2px solid rgb(var(--wall-line-rgb) / 72%);
  outline-offset: 2px;
}

.wall-nav__icon {
  flex: none;
  width: 0.86rem;
  height: 0.86rem;
  opacity: 0.82;
}

.wall-rail__head-btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0.35rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: rgb(var(--wall-ink-soft-rgb) / 58%);
  cursor: pointer;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.wall-rail__head-btn:hover {
  background: rgb(var(--wall-ink-soft-rgb) / 9%);
  color: rgb(var(--wall-ink-soft-rgb) / 92%);
}

.wall-rail__head-btn:focus-visible {
  outline: 2px solid rgb(var(--wall-line-rgb) / 70%);
  outline-offset: 2px;
}

.wall-rail__head-icon {
  width: 1rem;
  height: 1rem;
}

.wall-rail__calendar {
  flex: none;
}

.wall-rail__footer {
  flex: none;
  margin-top: auto;
}

.wall-explore {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: none;
  padding-top: 0.15rem;
}

.wall-explore__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.15rem;
}

.wall-explore__title {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: rgb(var(--wall-ink-soft-rgb) / 74%);
}

.wall-explore__rule {
  flex: 1 1 auto;
  border-top: 1px dashed rgb(var(--wall-line-rgb) / 18%);
}

.wall-connect {
  padding: 0.55rem 0.65rem 0.6rem;
  border: 1px solid rgb(var(--wall-line-rgb) / 13%);
  background: rgb(255 252 244 / 4%);
}

.wall-connect__label,
.wall-ai__label {
  margin: 0 0 0.35rem;
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  color: rgb(var(--wall-ink-soft-rgb) / 46%);
}

.wall-connect__list {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wall-connect__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.12rem 0;
  color: rgb(var(--wall-ink-soft-rgb) / 68%);
  text-decoration: none;
  transition: color 160ms ease;
}

.wall-connect__item:hover {
  color: rgb(var(--wall-ink-soft-rgb) / 94%);
}

.wall-connect__name {
  overflow: hidden;
  font-size: 0.66rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wall-connect__count {
  flex: none;
  font-size: 0.56rem;
  color: rgb(var(--wall-ink-soft-rgb) / 40%);
  font-variant-numeric: tabular-nums;
}

.wall-connect__empty {
  margin: 0;
  font-size: 0.62rem;
  color: rgb(var(--wall-ink-soft-rgb) / 40%);
}

.wall-ai {
  padding: 0.65rem 0.7rem 0.7rem;
  border: 1px solid rgb(var(--wall-line-rgb) / 14%);
  background: rgb(255 252 244 / 5%);
}

.wall-ai :deep(.widget-shell) {
  padding: 0;
  max-width: none;
}

.wall-ai :deep(.widget-head) {
  display: none;
}

.wall-ai :deep(.recent-card) {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  transform: none;
}

.wall-ai :deep(.recent-card::before) {
  display: none;
}

.wall-ai :deep(.recent-content) {
  font-size: 0.66rem;
  line-height: 1.66;
  color: rgb(var(--wall-ink-soft-rgb) / 64%);
}

.wall-ai__text {
  margin: 0;
  font-size: 0.66rem;
  line-height: 1.66;
  color: rgb(var(--wall-ink-soft-rgb) / 64%);
}

@media (width <= 1079px) {
  .wall-rail {
    width: min(100%, 46rem);
    height: auto;
    margin: 0 auto;
    padding-bottom: 0.35rem;
    overflow: visible;
  }

  .wall-rail__header {
    padding-top: 0.15rem;
  }

  .wall-rail :deep(.home-header__title) {
    font-size: 0.98rem;
  }

  .wall-nav {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .wall-nav__tab {
    flex-direction: column;
    gap: 0.22rem;
    align-items: flex-start;
    padding: 0.42rem 0.4rem;
    font-size: 0.62rem;
  }

  .wall-nav__tab.is-active::after {
    top: 0.3rem;
    right: 0.3rem;
  }

  .wall-rail__calendar {
    display: none;
  }

  .wall-rail__footer {
    display: none;
  }

  .wall-explore {
    display: none;
  }
}
</style>
