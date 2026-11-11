<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div
    class="wall-note"
    :class="[
      `wall-note--${paper}`,
      `wall-note--${size}`,
      `wall-note--fastener-${fastener}`,
      {
        'wall-note--featured': featured,
        'wall-note--image': hasImages,
        'wall-note--flow': flow,
        'wall-note--stacked': stacked,
        'wall-note--still': still,
      },
    ]"
    :style="noteStyle"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="interactive ? `${t('wall.openNote')}: ${dateParts.stamp} ${bodyText}` : undefined"
    @click="handleClick"
    @keydown.enter.prevent="handleKeyOpen"
    @keydown.space.prevent="handleKeyOpen"
  >
    <span class="wall-note__fastener" aria-hidden="true"></span>

    <div class="wall-note__sheet">
      <span class="wall-note__grain" aria-hidden="true"></span>

      <span class="wall-note__date">
        <span class="wall-note__stamp">{{ dateParts.stamp }}</span>
        <span class="wall-note__weekday">{{ dateParts.weekday }}</span>
        <span class="wall-note__clock">{{ dateParts.time }}</span>

        <span v-if="canManage" class="wall-note__menu-wrap" @click.stop @pointerdown.stop @keydown.stop>
          <button
            ref="menuTriggerRef"
            type="button"
            class="wall-note__menu-btn"
            :aria-label="t('echoCard.moreActions')"
            :aria-expanded="isMenuOpen"
            aria-haspopup="menu"
            @click.stop="toggleMenu"
          >
            <More class="wall-note__menu-icon" />
          </button>

          <Teleport to="body">
            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="isMenuOpen"
                ref="menuPanelRef"
                :style="menuPanelStyle"
                class="wall-note__menu"
              >
                <button
                  type="button"
                  class="menu-row"
                  @click="
                    () => {
                      closeMenu()
                      handleUpdateEcho()
                    }
                  "
                >
                  <EditEcho class="menu-row__icon" />
                  <span>{{ t('echoCard.update') }}</span>
                </button>
                <button
                  type="button"
                  class="menu-row menu-row--danger"
                  @click="
                    () => {
                      closeMenu()
                      handleDeleteEcho()
                    }
                  "
                >
                  <Roll class="menu-row__icon" />
                  <span>{{ t('echoCard.delete') }}</span>
                </button>
              </div>
            </transition>
          </Teleport>
        </span>
      </span>

      <div v-if="hasImages" class="wall-note__media" @click.stop @keydown.stop>
        <TheMediaPlayer :echo="echo" :layout="echo.layout" compact />
      </div>

      <span class="wall-note__body">
        <span class="wall-note__text">{{ bodyText }}</span>
      </span>

      <span v-if="tags.length || echo.private" class="wall-note__foot">
        <span class="wall-note__tags">
          <span v-for="tag in tags.slice(0, 2)" :key="tag.id">#{{ tag.name }}</span>
        </span>
        <span v-if="echo.private" class="wall-note__private" aria-hidden="true">
          <Lock class="wall-note__lock" />
        </span>
      </span>

      <div class="wall-note__actions" @click.stop @pointerdown.stop @keydown.stop>
        <TheEchoReactions :echo="echo" />
        <button type="button" class="wall-note__detail" @click.stop="handleDetail">
          <span>{{ t('wall.viewDetail') }}</span>
          <Open class="wall-note__detail-icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref } from 'vue'

const activeMenuId = ref<string | null>(null)
</script>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { fetchDeleteEcho, fetchGetEchoById } from '@/service/api'
import { theToast } from '@/utils/toast'
import { useBaseDialog } from '@/composables/useBaseDialog'
import { useEchoStore, useEditorStore, useUserStore } from '@/stores'
import Lock from '@/components/icons/lock.vue'
import Open from '@/components/icons/open.vue'
import More from '@/components/icons/more.vue'
import EditEcho from '@/components/icons/editecho.vue'
import Roll from '@/components/icons/roll.vue'
import TheEchoReactions from '@/components/advanced/echo/cards/TheEchoReactions.vue'
import { getEchoFiles } from '@/utils/echo'
import {
  wallBody,
  wallDateStamp,
  type WallEcho,
  type WallFastener,
  type WallPaper,
} from '@/utils/wall'

type WallSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(
  defineProps<{
    echo: WallEcho
    paper: WallPaper
    fastener: WallFastener
    size: WallSize
    width: number
    height: number
    x?: number
    y?: number
    rotation: number
    zIndex: number
    delay?: number
    featured?: boolean
    flow?: boolean
    stacked?: boolean
    interactive?: boolean
    still?: boolean
  }>(),
  { interactive: true, still: false },
)

const emit = defineEmits<{
  (
    event: 'open',
    payload: {
      echo: WallEcho
      event: MouseEvent
      meta: { paper: WallPaper; fastener: WallFastener; rotation: number }
    },
  ): void
  (event: 'view-detail', echo: WallEcho): void
  (event: 'refresh'): void
}>()

const TheMediaPlayer = defineAsyncComponent(
  () => import('@/components/advanced/media/TheMediaPlayer.vue'),
)

const { t } = useI18n()

const tags = computed(() => props.echo.tags ?? [])
const dateParts = computed(() => wallDateStamp(props.echo))
const bodyText = computed(() => wallBody(props.echo.content, 160))

const hasImages = computed(() => getEchoFiles(props.echo).some((item) => item.category === 'image'))

const handleClick = (event: MouseEvent) => {
  if (!props.interactive) return
  emit('open', {
    echo: props.echo,
    event,
    meta: { paper: props.paper, fastener: props.fastener, rotation: props.rotation },
  })
}

const handleKeyOpen = (event: KeyboardEvent) => {
  if (!props.interactive) return
  handleClick(event as unknown as MouseEvent)
}

const handleDetail = () => emit('view-detail', props.echo)

const userStore = useUserStore()
const echoStore = useEchoStore()
const editorStore = useEditorStore()
const router = useRouter()
const { openConfirm } = useBaseDialog()

const canManage = computed(() => props.interactive && userStore.isLogin)

const handleDeleteEcho = () => {
  openConfirm({
    title: String(t('echoCard.deleteConfirmTitle')),
    description: String(t('echoCard.deleteConfirmDesc')),
    onConfirm: () => {
      fetchDeleteEcho(String(props.echo.id)).then(() => {
        theToast.success(String(t('echoCard.deleteSuccess')))
        emit('refresh')
      })
    },
  })
}

const handleUpdateEcho = async () => {
  if (editorStore.isUpdateMode) {
    theToast.warning(String(t('echoCard.exitUpdateModeFirst')))
    await router.push({
      name: 'home',
      query: { ...router.currentRoute.value.query, tab: 'publish' },
    })
    return
  }

  const res = await fetchGetEchoById(String(props.echo.id))
  if (res.code === 1 && res.data) {
    echoStore.echoToUpdate = res.data
  } else {
    echoStore.echoToUpdate = props.echo
  }

  editorStore.isUpdateMode = true
  await router.push({
    name: 'home',
    query: { ...router.currentRoute.value.query, tab: 'publish' },
  })
}

const isMenuOpen = computed(() => activeMenuId.value === props.echo.id)
const menuTriggerRef = ref<HTMLElement | null>(null)
const menuPanelRef = ref<HTMLElement | null>(null)
const menuPanelStyle = ref<Record<string, string>>({})

const MENU_GAP = 8

const updateMenuPosition = () => {
  if (!isMenuOpen.value || !menuTriggerRef.value) return
  const rect = menuTriggerRef.value.getBoundingClientRect()
  const viewportRight = window.innerWidth
  const right = Math.max(MENU_GAP, viewportRight - rect.right)
  menuPanelStyle.value = {
    top: `${rect.bottom + MENU_GAP}px`,
    right: `${right}px`,
  }
}

const closeMenu = () => {
  if (isMenuOpen.value) activeMenuId.value = null
}

const toggleMenu = () => {
  activeMenuId.value = isMenuOpen.value ? null : props.echo.id
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target) return
  if (menuPanelRef.value?.contains(target) || menuTriggerRef.value?.contains(target)) return
  closeMenu()
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeMenu()
}

const SCROLL_LISTENER_OPTIONS: AddEventListenerOptions = { passive: true, capture: true }

const bindGlobalListeners = () => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', updateMenuPosition, { passive: true })
  window.addEventListener('scroll', updateMenuPosition, SCROLL_LISTENER_OPTIONS)
}

const unbindGlobalListeners = () => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', updateMenuPosition)
  window.removeEventListener('scroll', updateMenuPosition, SCROLL_LISTENER_OPTIONS)
}

watch(isMenuOpen, async (open) => {
  if (open) {
    await nextTick()
    updateMenuPosition()
    bindGlobalListeners()
  } else {
    unbindGlobalListeners()
  }
})

onBeforeUnmount(() => {
  if (isMenuOpen.value) {
    activeMenuId.value = null
    unbindGlobalListeners()
  }
})

const noteStyle = computed(() => ({
  ...(props.flow || props.stacked
    ? {}
    : {
        width: `${props.width}px`,
        ...(props.height > 0 ? { minHeight: `${props.height}px` } : {}),
        left: `${props.x ?? 0}px`,
        top: `${props.y ?? 0}px`,
      }),
  '--note-rotate': `${props.rotation}deg`,
  '--note-z': String(props.zIndex),
  '--note-delay': `${props.delay ?? 0}ms`,
}))
</script>

<style scoped>
.wall-note {
  position: absolute;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--wall-ink-strong);
  text-align: left;
  z-index: var(--note-z, 1);
  cursor: pointer;
  transform: rotate(var(--note-rotate, 0deg));
  transform-origin: 50% 44%;
  transition:
    transform 460ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 300ms ease;
  animation: wall-note-in 560ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: var(--note-delay, 0ms);
  -webkit-tap-highlight-color: transparent;
}

.wall-note--flow {
  position: relative;
  width: 100%;
  height: auto;
}

.wall-note--flow .wall-note__text {
  --note-lines: 10;
  font-size: 0.88rem;
  line-height: 1.78;
}

.wall-note--flow .wall-note__date {
  padding-top: 0.85rem;
  font-size: 0.64rem;
}

.wall-note--flow .wall-note__foot {
  padding-bottom: 0.08rem;
  font-size: 0.62rem;
}

.wall-note--flow .wall-note__actions :deep(.reaction-trigger) {
  height: 1.45rem;
  min-width: 1.45rem;
}

.wall-note--flow .wall-note__detail {
  font-size: 0.68rem;
}

.wall-note--flow .wall-note__sheet {
  height: auto;
  min-height: 6.5rem;
}

.wall-note--stacked {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
}

.wall-note--stacked .wall-note__sheet {
  height: auto;
  min-height: 6.5rem;
}

.wall-note--still {
  animation: none;
  cursor: default;
}

.wall-note__sheet {
  --note-shadow:
    0 1px 1px rgb(40 27 16 / 14%), 0 8px 16px -12px rgb(30 20 10 / 55%),
    0 22px 34px -28px rgb(30 20 10 / 50%);
  --note-shadow-hover:
    0 1px 1px rgb(40 27 16 / 15%), 0 16px 26px -14px rgb(30 20 10 / 52%),
    0 34px 54px -30px rgb(30 20 10 / 55%);

  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  min-height: 6.5rem;
  overflow: hidden;
  background-color: var(--wall-note-bg);
  background-image: var(--wall-note-image);
  border: 1px solid rgb(var(--wall-line-rgb) / 24%);
  border-radius: 1px;
  box-shadow: var(--note-shadow);
  transition: box-shadow 300ms ease;
}

.wall-note__grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='150' height='150' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

.wall-note__fastener {
  position: absolute;
  z-index: 4;
  top: -0.42rem;
  left: 50%;
  pointer-events: none;
}

.wall-note--fastener-pin .wall-note__fastener {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgb(255 255 255 / 80%), transparent 34%),
    radial-gradient(circle at 50% 56%, #6d5d4c 0 46%, #3e3327 100%);
  box-shadow:
    0 1px 1px rgb(0 0 0 / 30%),
    0 4px 6px -3px rgb(0 0 0 / 45%);
}

.wall-note--fastener-tape .wall-note__fastener {
  width: 3.2rem;
  height: 0.82rem;
  transform: translateX(-50%) rotate(-2.4deg);
  background:
    repeating-linear-gradient(90deg, rgb(90 72 48 / 7%) 0 1px, transparent 1px 5px),
    rgb(244 236 216 / 72%);
  box-shadow: 0 1px 2px rgb(60 40 20 / 12%);
  opacity: 0.85;
}

.wall-note--fastener-clip .wall-note__fastener {
  top: -0.3rem;
  width: 0.48rem;
  height: 1.2rem;
  transform: translateX(-50%) rotate(6deg);
  border: 1.5px solid rgb(92 74 54 / 62%);
  border-radius: 0.32rem;
  box-shadow: 0 2px 3px -2px rgb(0 0 0 / 35%);
}

.wall-note--fastener-clip .wall-note__fastener::after {
  content: '';
  position: absolute;
  inset: 0.16rem 0.1rem 0.18rem;
  border: 1px solid rgb(92 74 54 / 42%);
  border-radius: 0.24rem;
}

.wall-note--fastener-staple .wall-note__fastener {
  top: 0.1rem;
  width: 1.15rem;
  height: 0.32rem;
  transform: translateX(-50%) rotate(-14deg);
  border-top: 1px solid rgb(120 112 100 / 75%);
  border-bottom: 1px solid rgb(120 112 100 / 55%);
  border-radius: 1px;
}

.wall-note__date {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: baseline;
  gap: 0.32rem;
  padding: 0.72rem 0.8rem 0.22rem;
  font-size: 0.58rem;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: rgb(var(--wall-ink-rgb) / 72%);
  white-space: nowrap;
}

.wall-note__date::after {
  content: '';
  position: absolute;
  right: 0.8rem;
  bottom: 0;
  left: 0.8rem;
  height: 3px;
  pointer-events: none;
  opacity: 0.5;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='3'%3E%3Cpath d='M0 1.6 Q2.5 0.6 5 1.6 T10 1.6' fill='none' stroke='%23705c44' stroke-opacity='.4' stroke-width='.7' stroke-dasharray='2 1.4'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
}

.wall-note__stamp {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.wall-note__weekday {
  color: rgb(var(--wall-ink-rgb) / 52%);
}

.wall-note__clock {
  margin-left: auto;
  color: rgb(var(--wall-ink-rgb) / 42%);
  font-variant-numeric: tabular-nums;
}

.wall-note__menu-wrap {
  position: relative;
  z-index: 3;
  display: inline-flex;
  flex: none;
  margin-left: 0.3rem;
}

.wall-note__menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.15rem;
  height: 1.15rem;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(var(--wall-ink-rgb) / 48%);
  cursor: pointer;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.wall-note__menu-btn:hover,
.wall-note__menu-btn:focus-visible {
  color: var(--wall-ink-strong);
  background: rgb(var(--wall-ink-soft-rgb) / 8%);
}

.wall-note__menu-btn:focus-visible {
  outline: 2px solid var(--wall-focus);
  outline-offset: 1px;
}

.wall-note__menu-icon {
  width: 0.72rem;
  height: 0.72rem;
}

/* Paper scrap menu: same stock as the notes, a strip of tape on top and a
   slight tilt so the popover reads as another object on the desk. */
.wall-note__menu {
  position: fixed;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  min-width: 7.5rem;
  padding: 0.55rem 0.3rem 0.32rem;
  background-color: var(--wall-menu-bg);
  border: 1px solid rgb(var(--wall-line-rgb) / 30%);
  border-radius: 1px;
  box-shadow:
    0 1px 1px rgb(40 27 16 / 14%),
    0 10px 18px -12px rgb(30 20 10 / 55%),
    0 26px 38px -28px rgb(30 20 10 / 50%);
  transform: rotate(-0.8deg);
  transform-origin: 78% 0%;
}

.wall-note__menu::before {
  content: '';
  position: absolute;
  z-index: 2;
  top: -0.34rem;
  left: 50%;
  width: 2.7rem;
  height: 0.72rem;
  pointer-events: none;
  transform: translateX(-50%) rotate(-2.4deg);
  background:
    repeating-linear-gradient(90deg, rgb(90 72 48 / 7%) 0 1px, transparent 1px 5px),
    rgb(244 236 216 / 80%);
  box-shadow: 0 1px 2px rgb(60 40 20 / 12%);
}

.wall-note__menu::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='150' height='150' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

.menu-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 0;
  border-radius: 1px;
  background: transparent;
  font-size: 0.66rem;
  letter-spacing: 0.05em;
  color: rgb(var(--wall-ink-soft-rgb) / 86%);
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.menu-row + .menu-row {
  border-top: 1px dashed rgb(var(--wall-line-rgb) / 20%);
}

.menu-row:hover {
  background: rgb(var(--wall-ink-soft-rgb) / 7%);
  color: var(--wall-ink-strong);
}

.menu-row__icon {
  width: 0.78rem;
  height: 0.78rem;
  flex: none;
}

.menu-row--danger {
  color: rgb(var(--wall-accent-rgb) / 86%);
}

.menu-row--danger:hover {
  background: rgb(var(--wall-accent-rgb) / 9%);
  color: rgb(var(--wall-accent-rgb));
}

.wall-note__media {
  position: relative;
  z-index: 1;
  flex: 0 0 auto;
  margin: 0.45rem 0.72rem 0;
  overflow: hidden;
}

.wall-note__media :deep(.image-gallery-container) {
  width: 100%;
}

.wall-note__media :deep(.gallery-image-frame) {
  height: 100%;
}

.wall-note__media :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.88) contrast(0.98);
}

.wall-note__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 0.22rem;
  min-height: 0;
  padding: 0.34rem 0.8rem 0;
  overflow: hidden;
}

.wall-note__text {
  display: -webkit-box;
  flex: none;
  overflow: hidden;
  font-size: 0.84rem;
  line-height: 1.72;
  letter-spacing: 0.01em;
  color: rgb(var(--wall-ink-soft-rgb) / 82%);
  text-decoration: underline wavy rgb(var(--wall-line-rgb) / 18%);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--note-lines, 12);
  white-space: pre-line;
}

.wall-note__foot {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.8rem 0.08rem;
  font-size: 0.56rem;
  color: rgb(var(--wall-ink-rgb) / 48%);
}

.wall-note__tags {
  display: flex;
  gap: 0.38rem;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.wall-note__private {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
}

.wall-note__lock {
  width: 0.62rem;
  height: 0.62rem;
}

.wall-note__actions {
  --color-border-subtle: rgb(var(--wall-line-rgb) / 26%);
  --color-border-strong: rgb(var(--wall-line-rgb) / 42%);
  --color-bg-muted: rgb(var(--wall-ink-soft-rgb) / 6%);
  --color-text-muted: rgb(var(--wall-ink-rgb) / 62%);
  --color-text-primary: var(--wall-ink-strong);

  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  margin-top: 0.12rem;
  padding: 0.16rem 0.72rem 0.46rem;
  border-top: 1px dashed rgb(var(--wall-line-rgb) / 18%);
}

.wall-note__actions :deep(.echo-reactions-anchor) {
  display: inline-flex;
}

.wall-note__actions :deep(.reaction-trigger) {
  height: 1.3rem;
  min-width: 1.3rem;
  padding: 0 0.28rem;
}

.wall-note__actions :deep(.reaction-trigger-icon) {
  width: 0.8rem;
  height: 0.8rem;
}

.wall-note__actions :deep(.reaction-trigger-emoji) {
  font-size: 0.72rem;
}

.wall-note__actions :deep(.reaction-trigger-count) {
  font-size: 0.58rem;
}

.wall-note__detail {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.2rem;
  margin-right: -0.24rem;
  padding: 0.16rem 0.28rem;
  border: 1px solid transparent;
  border-radius: 1px;
  background: transparent;
  font-size: 0.58rem;
  letter-spacing: 0.04em;
  color: rgb(var(--wall-ink-rgb) / 58%);
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.wall-note__detail:hover {
  border-color: rgb(var(--wall-line-rgb) / 26%);
  background: rgb(var(--wall-ink-soft-rgb) / 5%);
  color: var(--wall-ink-strong);
}

.wall-note__detail:focus-visible {
  outline: 2px solid var(--wall-focus);
  outline-offset: 2px;
}

.wall-note__detail-icon {
  width: 0.62rem;
  height: 0.62rem;
  transition: transform 200ms ease;
}

.wall-note__detail:hover .wall-note__detail-icon {
  transform: translate(1px, -1px);
}

/* paper stocks */
.wall-note--ruled .wall-note__sheet {
  --note-shadow:
    0 1px 1px rgb(40 27 16 / 12%), 0 7px 14px -12px rgb(30 22 12 / 48%),
    0 20px 30px -28px rgb(30 22 12 / 42%);
  --note-shadow-hover:
    0 1px 1px rgb(40 27 16 / 14%), 0 15px 24px -16px rgb(30 22 12 / 50%),
    0 30px 46px -32px rgb(30 22 12 / 46%);

  border-color: rgb(var(--wall-line-rgb) / 26%);
  background-color: var(--wall-paper-ruled-bg);
  background-image: var(--wall-paper-ruled-image);
}

.wall-note--ruled .wall-note__body {
  padding-top: 0.28rem;
}

.wall-note--grid .wall-note__sheet {
  --note-shadow:
    0 1px 1px rgb(40 32 20 / 13%), 0 8px 18px -14px rgb(28 26 18 / 46%),
    0 24px 36px -30px rgb(28 26 18 / 40%);
  --note-shadow-hover:
    0 1px 1px rgb(40 32 20 / 15%), 0 16px 26px -18px rgb(28 26 18 / 48%),
    0 32px 50px -34px rgb(28 26 18 / 44%);

  border-color: rgb(var(--wall-line-rgb) / 26%);
  background-color: var(--wall-paper-grid-bg);
  background-image: var(--wall-paper-grid-image);
}

.wall-note--kraft .wall-note__sheet {
  --note-shadow:
    0 1px 1px rgb(60 36 12 / 20%), 0 10px 20px -14px rgb(62 38 14 / 58%),
    0 26px 40px -30px rgb(62 38 14 / 50%);
  --note-shadow-hover:
    0 1px 1px rgb(60 36 12 / 22%), 0 18px 30px -18px rgb(62 38 14 / 60%),
    0 36px 56px -34px rgb(62 38 14 / 52%);

  background-color: var(--wall-paper-kraft-bg);
  background-image: var(--wall-paper-kraft-image);
  border-color: rgb(var(--wall-line-rgb) / 36%);
}

.wall-note--kraft .wall-note__date,
.wall-note--kraft .wall-note__foot {
  color: rgb(var(--wall-ink-deep-rgb) / 78%);
}

.wall-note--kraft .wall-note__text {
  color: rgb(var(--wall-ink-deep-rgb) / 94%);
  text-decoration-color: rgb(var(--wall-line-rgb) / 26%);
}

.wall-note--torn .wall-note__sheet {
  --note-shadow: none;
  --note-shadow-hover: none;

  border: 1px solid rgb(var(--wall-line-rgb) / 20%);
  border-radius: 1px;
  clip-path: polygon(
    0% 0.8%,
    6% 0%,
    18% 0.7%,
    32% 0%,
    47% 0.6%,
    62% 0%,
    76% 0.8%,
    90% 0%,
    98% 0.6%,
    100% 1.4%,
    99.2% 15%,
    100% 30%,
    99.3% 45%,
    100% 60%,
    99.2% 75%,
    100% 88%,
    100% 100%,
    0% 100%,
    0.8% 85%,
    0% 70%,
    0.7% 55%,
    0% 40%,
    0.8% 25%,
    0% 10%
  );
  filter: drop-shadow(0 2px 2px rgb(40 26 14 / 16%)) drop-shadow(0 10px 16px rgb(40 26 14 / 24%));
}

.wall-note--torn .wall-note__sheet,
.wall-note--torn .wall-note__sheet * {
  box-shadow: none;
}

.wall-note--index .wall-note__sheet {
  --note-shadow:
    0 1px 0 rgb(40 30 18 / 13%), 0 6px 12px -12px rgb(30 24 14 / 48%),
    0 16px 26px -24px rgb(30 24 14 / 40%);
  --note-shadow-hover:
    0 1px 0 rgb(40 30 18 / 15%), 0 14px 24px -16px rgb(30 24 14 / 50%),
    0 28px 44px -30px rgb(30 24 14 / 44%);

  background-color: var(--wall-paper-index-bg);
  border-color: rgb(var(--wall-line-rgb) / 28%);
  background-image: var(--wall-paper-index-image);
}

.wall-note--index .wall-note__sheet::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--sj-accent, rgb(var(--wall-accent-rgb)));
  opacity: 0.72;
}

.wall-note--index .wall-note__date {
  padding-top: 0.62rem;
}

/* interaction */
@media (hover: hover) {
  .wall-note:hover {
    z-index: 9990;
    transform: rotate(var(--note-rotate, 0deg)) translateY(-3px);
  }

  .wall-note:hover .wall-note__sheet {
    box-shadow: var(--note-shadow-hover);
  }

  .wall-note--torn:hover .wall-note__sheet {
    filter: drop-shadow(0 3px 3px rgb(40 26 14 / 18%)) drop-shadow(0 16px 24px rgb(40 26 14 / 28%));
  }
}

.wall-note:focus-visible {
  z-index: 9995;
  outline: 2px solid var(--wall-focus);
  outline-offset: 4px;
}

/* A lifted card keeps its exact geometry so the lightbox can scale it one-to-one. */
@media (hover: hover) {
  .wall-note--still:hover {
    z-index: var(--note-z, 1);
    transform: rotate(var(--note-rotate, 0deg));
  }

  .wall-note--still:hover .wall-note__sheet {
    box-shadow: var(--note-shadow);
  }
}

@keyframes wall-note-in {
  from {
    opacity: 0;
    filter: blur(2.5px);
    transform: rotate(var(--note-rotate, 0deg)) translateY(16px) scale(0.96);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: rotate(var(--note-rotate, 0deg)) translateY(0) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wall-note {
    animation: none;
    transition: none;
  }

  .wall-note:hover {
    transform: rotate(var(--note-rotate, 0deg));
  }
}
</style>
