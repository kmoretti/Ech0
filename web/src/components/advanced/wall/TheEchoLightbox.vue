<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <Teleport to="body">
    <Transition name="wall-lightbox" @after-leave="restoreBody">
      <div
        v-if="modelValue"
        class="wall-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="dateParts.stamp"
        @click.self="close"
      >
        <div class="wall-lightbox__card" :style="cardStyle">
          <span class="wall-lightbox__grain" aria-hidden="true"></span>
          <span class="wall-lightbox__pin" aria-hidden="true"></span>

          <header class="wall-lightbox__head">
            <div class="wall-lightbox__date">
              <span class="wall-lightbox__stamp">{{ dateParts.stamp }}</span>
              <span class="wall-lightbox__weekday">{{ dateParts.weekday }}</span>
              <span class="wall-lightbox__clock">{{ dateParts.time }}</span>
            </div>
            <button
              ref="closeRef"
              type="button"
              class="wall-lightbox__close"
              :aria-label="t('wall.close')"
              :title="t('wall.close')"
              @click="close"
            >
              <Close class="wall-lightbox__close-icon" />
            </button>
          </header>

          <div class="wall-lightbox__scroll">
            <div v-if="mediaEcho" class="wall-lightbox__media">
              <TheMediaPlayer :echo="modelValue" :layout="modelValue.layout" priority />
            </div>

            <div class="wall-lightbox__prose">
              <TheMdPreview :content="modelValue.content" />
            </div>

            <div v-if="tags.length" class="wall-lightbox__tags">
              <span v-for="tag in tags" :key="tag.id">#{{ tag.name }}</span>
            </div>
          </div>

          <footer class="wall-lightbox__foot">
            <TheEchoReactions :echo="modelValue" />
            <button type="button" class="wall-lightbox__detail" @click="openDetail">
              <span>{{ t('wall.viewDetail') }}</span>
              <Open class="wall-lightbox__detail-icon" />
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Close from '@/components/icons/close.vue'
import Open from '@/components/icons/open.vue'
import { TheMdPreview } from '@/components/advanced/md'
import TheEchoReactions from '@/components/advanced/echo/cards/TheEchoReactions.vue'
import { getEchoFiles } from '@/utils/echo'
import { wallDateStamp, type WallEcho } from '@/utils/wall'

const TheMediaPlayer = defineAsyncComponent(
  () => import('@/components/advanced/media/TheMediaPlayer.vue'),
)

type OriginRect = { left: number; top: number; width: number; height: number }

const props = defineProps<{
  modelValue: WallEcho | null
  originRect?: OriginRect | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: WallEcho | null): void
  (event: 'view-detail', echo: WallEcho): void
}>()

const { t } = useI18n()
const closeRef = ref<HTMLButtonElement | null>(null)
const cardStyle = ref<Record<string, string>>({})
let previousOverflow = ''
let previousFocus: HTMLElement | null = null

const tags = computed(() => props.modelValue?.tags ?? [])
const dateParts = computed(() =>
  props.modelValue ? wallDateStamp(props.modelValue) : { stamp: '', weekday: '', time: '' },
)
const mediaEcho = computed(() => {
  if (!props.modelValue) return false
  return getEchoFiles(props.modelValue).length > 0
})

const buildOriginStyle = () => {
  const width = Math.min(window.innerWidth * 0.92, 720)
  const origin = props.originRect
  if (!origin) {
    return {
      '--from-x': '0px',
      '--from-y': '48px',
      '--from-scale': '0.96',
    }
  }
  const originX = origin.left + origin.width / 2 - window.innerWidth / 2
  const originY = origin.top + origin.height / 2 - window.innerHeight / 2
  const scale = Math.max(0.18, Math.min(1, origin.width / width))
  return {
    '--from-x': `${originX}px`,
    '--from-y': `${originY}px`,
    '--from-scale': String(scale),
  }
}

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
      previousFocus = document.activeElement as HTMLElement | null
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      cardStyle.value = buildOriginStyle()
      await nextTick()
      closeRef.value?.focus({ preventScroll: true })
      return
    }
    restoreBody()
    previousFocus?.focus?.({ preventScroll: true })
  },
)

const close = () => emit('update:modelValue', null)

const openDetail = () => {
  if (!props.modelValue) return
  emit('view-detail', props.modelValue)
}

const restoreBody = () => {
  document.body.style.overflow = previousOverflow
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  restoreBody()
})
</script>

<style scoped>
.wall-lightbox {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: color-mix(in srgb, var(--color-bg-canvas) 74%, transparent);
  backdrop-filter: blur(10px) saturate(0.9);
}

.wall-lightbox__card {
  /* The note is always light paper, so keep its ink light-theme in dark mode. */
  --color-text-primary: #332b23;
  --color-text-secondary: rgb(70 56 40 / 72%);
  --color-border-subtle: rgb(92 72 48 / 24%);
  --color-focus-ring: #3a2f24;

  position: relative;
  display: flex;
  flex-direction: column;
  width: min(92vw, 45rem);
  max-height: 86dvh;
  color: #2c2620;
  background-color: #f7f1e5;
  background-image:
    radial-gradient(circle at 18% 4%, rgb(255 255 255 / 66%), transparent 42%),
    radial-gradient(circle at 84% 96%, rgb(96 70 42 / 5%), transparent 55%);
  border: 1px solid rgb(92 72 48 / 26%);
  border-radius: 1px;
  box-shadow:
    0 2px 3px rgb(20 12 6 / 20%),
    0 32px 70px -30px rgb(10 6 2 / 70%),
    0 80px 120px -80px rgb(10 6 2 / 70%);
  transform: translate(0, 0) scale(1);
}

.wall-lightbox__grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

.wall-lightbox__pin {
  position: absolute;
  top: -0.4rem;
  left: 50%;
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgb(255 255 255 / 82%), transparent 34%),
    radial-gradient(circle at 50% 56%, #746352 0 46%, #413528 100%);
  box-shadow:
    0 1px 1px rgb(0 0 0 / 30%),
    0 5px 8px -4px rgb(0 0 0 / 46%);
  transform: translateX(-50%);
}

.wall-lightbox__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.4rem 0.65rem;
  border-bottom: 1px dashed rgb(92 72 48 / 22%);
}

.wall-lightbox__date {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.4rem;
  font-family: var(--font-family-display);
}

.wall-lightbox__stamp {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #3a2f25;
}

.wall-lightbox__weekday,
.wall-lightbox__clock {
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: rgb(70 56 40 / 55%);
}

.wall-lightbox__close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  margin-top: -0.2rem;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: rgb(70 56 40 / 58%);
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.wall-lightbox__close:hover {
  border-color: rgb(92 72 48 / 28%);
  background: rgb(70 56 40 / 6%);
  color: #2c2620;
}

.wall-lightbox__close:focus-visible {
  outline: 2px solid #3a2f24;
  outline-offset: 2px;
}

.wall-lightbox__close-icon {
  width: 0.95rem;
  height: 0.95rem;
}

.wall-lightbox__scroll {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  padding: 1.1rem 1.4rem 0.9rem;
  overflow-y: auto;
  scrollbar-width: none;
}

.wall-lightbox__scroll::-webkit-scrollbar {
  display: none;
}

.wall-lightbox__media {
  margin-bottom: 1rem;
}

.wall-lightbox__prose {
  font-family: var(--font-family-display);
  font-size: 0.94rem;
  line-height: 1.85;
  color: #332b23;
}

.wall-lightbox__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.1rem;
  padding-top: 0.7rem;
  border-top: 1px dashed rgb(92 72 48 / 20%);
  font-family: var(--font-family-display);
  font-size: 0.64rem;
  letter-spacing: 0.04em;
  color: rgb(70 56 40 / 58%);
}

.wall-lightbox__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.65rem 1.4rem 0.85rem;
  border-top: 1px dashed rgb(92 72 48 / 20%);
}

.wall-lightbox__detail {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid transparent;
  border-radius: 1px;
  background: transparent;
  font-family: var(--font-family-display);
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: rgb(70 56 40 / 62%);
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.wall-lightbox__detail:hover {
  border-color: rgb(92 72 48 / 26%);
  background: rgb(70 56 40 / 5%);
  color: #2c2620;
}

.wall-lightbox__detail:focus-visible {
  outline: 2px solid #3a2f24;
  outline-offset: 2px;
}

.wall-lightbox__detail-icon {
  width: 0.72rem;
  height: 0.72rem;
  transition: transform 200ms ease;
}

.wall-lightbox__detail:hover .wall-lightbox__detail-icon {
  transform: translate(1px, -1px);
}

.wall-lightbox-enter-active .wall-lightbox__card,
.wall-lightbox-leave-active .wall-lightbox__card {
  transition:
    transform 560ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 260ms ease;
}

.wall-lightbox-enter-from,
.wall-lightbox-leave-to {
  opacity: 0;
}

.wall-lightbox-enter-from .wall-lightbox__card,
.wall-lightbox-leave-to .wall-lightbox__card {
  opacity: 0;
  transform: translate(var(--from-x), var(--from-y)) scale(var(--from-scale));
}

.wall-lightbox-enter-active {
  transition:
    background-color 360ms ease,
    backdrop-filter 360ms ease;
}

.wall-lightbox-leave-active {
  transition:
    background-color 280ms ease,
    backdrop-filter 280ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .wall-lightbox-enter-active .wall-lightbox__card,
  .wall-lightbox-leave-active .wall-lightbox__card {
    transition: opacity 160ms ease;
  }

  .wall-lightbox-enter-from .wall-lightbox__card,
  .wall-lightbox-leave-to .wall-lightbox__card {
    transform: none;
  }
}

@media (width <= 640px) {
  .wall-lightbox {
    padding: 0.6rem;
  }

  .wall-lightbox__card {
    width: 100%;
    max-height: 92dvh;
  }

  .wall-lightbox__head {
    padding: 1rem 1rem 0.55rem;
  }

  .wall-lightbox__scroll {
    padding: 0.85rem 1rem 0.7rem;
  }

  .wall-lightbox__foot {
    padding: 0.55rem 1rem 0.7rem;
  }

  .wall-lightbox__prose {
    font-size: 0.9rem;
  }
}
</style>
