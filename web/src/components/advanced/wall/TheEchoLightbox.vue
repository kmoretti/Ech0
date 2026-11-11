<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <Teleport to="body">
    <Transition
      name="wall-lightbox"
      :duration="{ enter: 940, leave: 640 }"
      @after-leave="restoreBody"
    >
      <div
        v-if="modelValue"
        class="wall-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="dateParts.stamp"
        @click.self="close"
      >
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

        <div class="wall-lightbox__stage" :style="stageStyle">
          <TheWallNote
            :stacked="isDesktop"
            :flow="!isDesktop"
            still
            :interactive="false"
            :echo="modelValue"
            :paper="paper"
            :fastener="fastener"
            size="md"
            :width="0"
            :height="0"
            :rotation="0"
            :z-index="1"
            @view-detail="openDetail"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import Close from '@/components/icons/close.vue'
import TheWallNote from './TheWallNote.vue'
import {
  hashString,
  wallDateStamp,
  type WallEcho,
  type WallFastener,
  type WallPaper,
} from '@/utils/wall'

type OriginRect = { left: number; top: number; width: number; height: number }
type OriginMeta = { paper: WallPaper; fastener: WallFastener; rotation: number }

const props = defineProps<{
  modelValue: WallEcho | null
  originRect?: OriginRect | null
  originMeta?: OriginMeta | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: WallEcho | null): void
  (event: 'view-detail', echo: WallEcho): void
}>()

const { t } = useI18n()
const isDesktop = useMediaQuery('(min-width: 1080px)')
const closeRef = ref<HTMLButtonElement | null>(null)
const stageStyle = ref<Record<string, string>>({})
let previousOverflow = ''
let previousFocus: HTMLElement | null = null

const dateParts = computed(() =>
  props.modelValue ? wallDateStamp(props.modelValue) : { stamp: '', weekday: '', time: '' },
)

const paper = computed<WallPaper>(() => props.originMeta?.paper ?? 'plain')
const fastener = computed<WallFastener>(() => props.originMeta?.fastener ?? 'pin')

/**
 * A rotated card's bounding box is larger than the card itself. Recover the
 * unrotated layout box so the opened card keeps exactly the same width (and
 * therefore the same line breaks) as the note it lifted from.
 */
const layoutBox = () => {
  const rect = props.originRect
  const fallback = { width: 320, height: 240 }
  if (!rect) return fallback
  const angle = ((props.originMeta?.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.abs(Math.sin(angle))
  return {
    width: Math.max(120, rect.width * cos - rect.height * sin),
    height: Math.max(80, rect.height * cos - rect.width * sin),
  }
}

const stageWidth = computed(() => {
  const viewport = Math.max(0, window.innerWidth - 24)
  return Math.max(120, Math.min(layoutBox().width, viewport, 560))
})

/** Every note gets its own lift: small notes rise more, large ones less. */
const scaleBias = computed(() => {
  if (!props.modelValue) return 0.06
  return ((hashString(`${props.modelValue.id}:open`) % 1000) / 1000) * 0.12
})

const targetScale = computed(() => {
  const width = stageWidth.value
  const height = layoutBox().height
  const base = width < 220 ? 1.32 : width < 280 ? 1.22 : 1.14
  const preferred = base + scaleBias.value
  const maxWidth = (window.innerWidth - 16) / width
  const maxHeight = (window.innerHeight - 150) / height
  return Math.max(1, Math.min(preferred, 1.46, maxWidth, maxHeight))
})

const buildOriginStyle = () => {
  const width = stageWidth.value
  const origin = props.originRect
  const base: Record<string, string> = {
    width: `${width}px`,
    '--target-scale': String(targetScale.value),
  }
  if (!origin) {
    return {
      ...base,
      '--from-x': '0px',
      '--from-y': '48px',
      '--from-rotate': '0deg',
      '--from-scale': '0.96',
    }
  }
  const originX = origin.left + origin.width / 2 - window.innerWidth / 2
  const originY = origin.top + origin.height / 2 - window.innerHeight / 2
  return {
    ...base,
    '--from-x': `${originX}px`,
    '--from-y': `${originY}px`,
    '--from-rotate': `${props.originMeta?.rotation ?? 0}deg`,
    '--from-scale': '1',
  }
}

watch(
  () => props.modelValue,
  async (value) => {
    if (value) {
      previousFocus = document.activeElement as HTMLElement | null
      previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      stageStyle.value = buildOriginStyle()
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
  padding: 2.4rem 1rem;
}

.wall-lightbox::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 44%,
    color-mix(in srgb, var(--color-bg-canvas) 54%, transparent) 0%,
    color-mix(in srgb, var(--color-bg-canvas) 78%, transparent) 58%,
    color-mix(in srgb, var(--color-bg-canvas) 88%, transparent) 100%
  );
  backdrop-filter: blur(12px) saturate(0.88);
  opacity: 1;
}

.wall-lightbox__stage {
  position: relative;
  z-index: 1;
  transform: translate(0, 0) rotate(0deg) scale(var(--target-scale, 1.18));
  transform-origin: center center;
  will-change: transform, opacity, filter;
  transition:
    transform 760ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 260ms ease,
    filter 320ms ease;
}

.wall-lightbox__stage :deep(.wall-note) {
  cursor: default;
}

.wall-lightbox__close {
  position: fixed;
  top: 1.1rem;
  right: 1.2rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid rgb(var(--wall-line-rgb) / 22%);
  border-radius: 50%;
  background: rgb(var(--wall-chip-bg-rgb) / 84%);
  color: rgb(var(--wall-ink-soft-rgb) / 60%);
  cursor: pointer;
  box-shadow: 0 6px 14px -12px rgb(0 0 0 / 55%);
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.wall-lightbox__close:hover {
  border-color: rgb(var(--wall-line-rgb) / 38%);
  background: rgb(var(--wall-chip-strong-rgb) / 96%);
  color: var(--wall-ink-strong);
}

.wall-lightbox__close:focus-visible {
  outline: 2px solid var(--wall-focus);
  outline-offset: 2px;
}

.wall-lightbox__close-icon {
  width: 0.9rem;
  height: 0.9rem;
}

/* The backdrop breathes in independently of the lifted note. */
.wall-lightbox-enter-active::before {
  transition: opacity 680ms cubic-bezier(0.42, 0, 0.58, 1);
}

.wall-lightbox-leave-active::before {
  transition: opacity 420ms cubic-bezier(0.4, 0, 1, 1);
}

.wall-lightbox-enter-from::before,
.wall-lightbox-leave-to::before {
  opacity: 0;
}

.wall-lightbox-enter-active .wall-lightbox__stage {
  transition:
    transform 900ms cubic-bezier(0.3, 0.02, 0.2, 1.04),
    opacity 460ms ease-out,
    filter 560ms ease;
}

.wall-lightbox-leave-active .wall-lightbox__stage {
  transition:
    transform 560ms cubic-bezier(0.4, 0, 0.55, 1),
    opacity 360ms ease,
    filter 340ms ease;
}

.wall-lightbox-enter-from .wall-lightbox__stage,
.wall-lightbox-leave-to .wall-lightbox__stage {
  transform: translate(var(--from-x), var(--from-y)) rotate(var(--from-rotate))
    scale(var(--from-scale));
}

.wall-lightbox-enter-from .wall-lightbox__stage {
  opacity: 0.45;
  filter: blur(1.4px);
}

.wall-lightbox-leave-to .wall-lightbox__stage {
  opacity: 0;
  filter: blur(1.6px);
}

.wall-lightbox-enter-from .wall-lightbox__close {
  opacity: 0;
  transform: scale(0.86) rotate(-8deg);
}

.wall-lightbox-enter-active .wall-lightbox__close {
  transition:
    opacity 320ms ease 240ms,
    transform 460ms cubic-bezier(0.16, 1, 0.3, 1) 200ms;
}

.wall-lightbox-leave-to .wall-lightbox__close {
  opacity: 0;
  transform: scale(0.92);
}

.wall-lightbox-leave-active .wall-lightbox__close {
  transition:
    opacity 180ms ease,
    transform 220ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .wall-lightbox-enter-active::before,
  .wall-lightbox-leave-active::before {
    transition: opacity 160ms ease;
  }

  .wall-lightbox-enter-active .wall-lightbox__stage,
  .wall-lightbox-leave-active .wall-lightbox__stage {
    transition: opacity 160ms ease;
  }

  .wall-lightbox-enter-from .wall-lightbox__stage,
  .wall-lightbox-leave-to .wall-lightbox__stage {
    transform: scale(var(--target-scale, 1.18));
    filter: none;
  }

  .wall-lightbox__close {
    transition: none;
  }
}

@media (width <= 640px) {
  .wall-lightbox {
    padding: 3rem 0.6rem;
  }

  .wall-lightbox__close {
    top: 0.7rem;
    right: 0.7rem;
  }
}
</style>
