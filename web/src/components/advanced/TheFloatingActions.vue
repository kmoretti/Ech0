<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSettingStore, useUserStore } from '@/stores'
import Publish from '@/components/icons/publish.vue'
import Chat from '@/components/icons/chat.vue'
import Arrowup from '@/components/icons/arrowup.vue'

const emit = defineEmits<{
  'open-chat': []
}>()

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const settingStore = useSettingStore()
const { AgentSetting } = storeToRefs(settingStore)
const showBackTop = ref(false)

const chatAvailable = computed(() => userStore.isLogin && AgentSetting.value.enable)
const isVisible = computed(
  () => !['auth', 'init', 'panel', 'chat'].includes(String(route.name ?? '')),
)

const getScrollContainer = () => {
  const homeMain = document.querySelector<HTMLElement>('.home-main')
  if (!homeMain || homeMain.scrollHeight <= homeMain.clientHeight + 1) return null
  const overflowY = window.getComputedStyle(homeMain).overflowY
  return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'
    ? homeMain
    : null
}

const updateBackTop = () => {
  const container = getScrollContainer()
  showBackTop.value = (container?.scrollTop ?? window.scrollY) > 320
}

const openPublish = () => {
  router.push(
    userStore.isLogin ? { name: 'home', query: { tab: 'publish' } } : { name: 'auth' },
  )
}

const scrollToTop = () => {
  const container = getScrollContainer()
  if (container) container.scrollTo({ top: 0, behavior: 'smooth' })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

const onScroll = () => updateBackTop()

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true, capture: true })
  updateBackTop()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll, true)
})
</script>

<template>
  <nav v-if="isVisible" class="floating-actions" :aria-label="t('homeNav.publish')">
    <Transition name="floating-action">
      <button
        v-if="showBackTop"
        type="button"
        class="floating-actions__button"
        :aria-label="t('commonNav.backHome')"
        @click="scrollToTop"
      >
        <Arrowup />
      </button>
    </Transition>
    <button
      v-if="chatAvailable"
      type="button"
      class="floating-actions__button"
      :aria-label="t('chatLauncher.title')"
      @click="emit('open-chat')"
    >
      <Chat />
    </button>
    <button
      type="button"
      class="floating-actions__button floating-actions__button--primary"
      :aria-label="t('homeNav.publish')"
      @click="openPublish"
    >
      <Publish />
    </button>
  </nav>
</template>

<style scoped>
.floating-actions {
  position: fixed;
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
  z-index: 1500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
}

.floating-actions__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-bg-surface) 92%, transparent);
  border: 1px solid var(--color-border-subtle);
  border-radius: 50%;
  box-shadow: 0 10px 28px rgb(0 0 0 / 10%);
  backdrop-filter: blur(12px);
  transition: transform 180ms ease, color 180ms ease, box-shadow 180ms ease;
}

.floating-actions__button:hover {
  color: var(--color-accent);
  box-shadow: 0 14px 32px rgb(0 0 0 / 14%);
  transform: translateY(-2px);
}

.floating-actions__button--primary {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-bg-surface) 86%, var(--color-accent) 14%);
  border-color: color-mix(in srgb, var(--color-accent) 36%, var(--color-border-subtle));
}

.floating-actions__button :deep(svg) {
  width: 1.15rem;
  height: 1.15rem;
}

.floating-action-enter-active,
.floating-action-leave-active {
  transition: opacity 220ms ease, transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.floating-action-enter-from,
.floating-action-leave-to {
  opacity: 0;
  transform: translateY(0.75rem) scale(0.8);
}

@media (width < 640px) {
  .floating-actions {
    right: max(0.75rem, env(safe-area-inset-right));
    bottom: max(0.75rem, env(safe-area-inset-bottom));
  }
}

@media (prefers-reduced-motion: reduce) {
  .floating-actions__button,
  .floating-action-enter-active,
  .floating-action-leave-active {
    transition: none;
  }
}
</style>
