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
        <div ref="cardRef" class="wall-lightbox__card" :class="cardClasses" :style="cardStyle">
          <span class="wall-lightbox__grain" aria-hidden="true"></span>
          <span class="wall-lightbox__fastener" aria-hidden="true"></span>

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
import { wallDateStamp, type WallEcho, type WallFastener, type WallPaper } from '@/utils/wall'

const TheMediaPlayer = defineAsyncComponent(
  () => import('@/components/advanced/media/TheMediaPlayer.vue'),
)

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
const cardRef = ref<HTMLDivElement | null>(null)
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

const paper = computed<WallPaper>(() => props.originMeta?.paper ?? 'plain')
const fastener = computed<WallFastener>(() => props.originMeta?.fastener ?? 'pin')
const cardClasses = computed(() => [
  `wall-lightbox__card--${paper.value}`,
  `wall-lightbox__card--fastener-${fastener.value}`,
])

const cardWidth = () => {
  const viewport = Math.max(0, window.innerWidth - 24)
  const preferred = props.originRect?.width ?? 320
  return Math.max(200, Math.min(preferred, viewport, 760))
}

const buildOriginStyle = () => {
  const width = cardWidth()
  const origin = props.originRect
  const style: Record<string, string> = {
    width: `${width}px`,
  }
  if (!origin) {
    return {
      ...style,
      '--from-x': '0px',
      '--from-y': '48px',
      '--from-rotate': '0deg',
      '--from-scale': '0.96',
    }
  }
  const originX = origin.left + origin.width / 2 - window.innerWidth / 2
  const originY = origin.top + origin.height / 2 - window.innerHeight / 2
  return {
    ...style,
    '--from-x': `${originX}px`,
    '--from-y': `${originY}px`,
    '--from-rotate': `${props.originMeta?.rotation ?? 0}deg`,
    '--from-scale': String(Math.min(1, width / origin.width)),
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
  padding: 0.75rem;
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
  max-width: 92vw;
  max-height: 86dvh;
  overflow: hidden;
  color: #2c2620;
  background-color: #f5efe2;
  background-image:
    radial-gradient(circle at 18% 8%, rgb(255 255 255 / 55%), transparent 44%),
    radial-gradient(circle at 82% 94%, rgb(92 68 42 / 5%), transparent 56%);
  border: 1px solid rgb(92 72 48 / 24%);
  border-radius: 1px;
  box-shadow:
    0 1px 1px rgb(40 27 16 / 14%),
    0 16px 26px -14px rgb(30 20 10 / 52%),
    0 34px 54px -30px rgb(30 20 10 / 55%);
  transform: translate(0, 0) rotate(0deg) scale(1);
  transition: box-shadow 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wall-lightbox__grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E");
}

.wall-lightbox__fastener {
  position: absolute;
  z-index: 6;
  top: -0.38rem;
  left: 50%;
  pointer-events: none;
}

.wall-lightbox__card--fastener-pin .wall-lightbox__fastener {
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

.wall-lightbox__card--fastener-tape .wall-lightbox__fastener {
  width: 3.4rem;
  height: 0.9rem;
  transform: translateX(-50%) rotate(-2.2deg);
  background:
    repeating-linear-gradient(90deg, rgb(90 72 48 / 8%) 0 1px, transparent 1px 5px),
    rgb(244 236 216 / 78%);
  box-shadow: 0 1px 2px rgb(60 40 20 / 12%);
}

.wall-lightbox__card--fastener-clip .wall-lightbox__fastener {
  top: -0.3rem;
  width: 0.5rem;
  height: 1.26rem;
  border: 1.5px solid rgb(92 74 54 / 62%);
  border-radius: 0.32rem;
  transform: translateX(-50%) rotate(6deg);
  box-shadow: 0 2px 3px -2px rgb(0 0 0 / 35%);
}

.wall-lightbox__card--fastener-clip .wall-lightbox__fastener::after {
  content: '';
  position: absolute;
  inset: 0.16rem 0.1rem 0.18rem;
  border: 1px solid rgb(92 74 54 / 42%);
  border-radius: 0.24rem;
}

.wall-lightbox__card--fastener-staple .wall-lightbox__fastener {
  top: 0.16rem;
  width: 1.2rem;
  height: 0.34rem;
  border-top: 1px solid rgb(120 112 100 / 75%);
  border-bottom: 1px solid rgb(120 112 100 / 55%);
  transform: translateX(-50%) rotate(-14deg);
}

/* paper stocks */
.wall-lightbox__card--ruled {
  background-color: #f7f2e7;
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0 1.32rem,
      rgb(92 104 118 / 13%) 1.32rem calc(1.32rem + 1px)
    ),
    radial-gradient(circle at 18% 10%, rgb(255 255 255 / 55%), transparent 42%);
}

.wall-lightbox__card--grid {
  background-color: #f2efe5;
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0 0.92rem,
      rgb(100 100 84 / 11%) 0.92rem calc(0.92rem + 1px)
    ),
    repeating-linear-gradient(
      to right,
      transparent 0 0.92rem,
      rgb(100 100 84 / 11%) 0.92rem calc(0.92rem + 1px)
    );
}

.wall-lightbox__card--kraft {
  background-color: #c8a97e;
  background-image:
    radial-gradient(circle at 24% 12%, rgb(255 245 220 / 28%), transparent 46%),
    radial-gradient(circle at 86% 90%, rgb(88 58 28 / 12%), transparent 52%);
  border-color: rgb(70 48 24 / 28%);
}

.wall-lightbox__card--kraft .wall-lightbox__stamp,
.wall-lightbox__card--kraft .wall-lightbox__prose,
.wall-lightbox__card--kraft .wall-lightbox__prose :deep(.echo-markdown) {
  color: #2c1e0e;
}

.wall-lightbox__card--kraft .wall-lightbox__weekday,
.wall-lightbox__card--kraft .wall-lightbox__clock,
.wall-lightbox__card--kraft .wall-lightbox__tags,
.wall-lightbox__card--kraft .wall-lightbox__foot {
  color: rgb(54 38 20 / 74%);
}

.wall-lightbox__card--torn {
  border: 0;
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
  filter: drop-shadow(0 12px 16px rgb(40 26 14 / 24%));
  box-shadow: none;
}

.wall-lightbox__card--index {
  background-color: #fbfaf4;
  border-color: rgb(84 70 52 / 20%);
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0 1.22rem,
      rgb(84 94 112 / 10%) 1.22rem calc(1.22rem + 1px)
    ),
    radial-gradient(circle at 20% 8%, rgb(255 255 255 / 60%), transparent 40%);
}

.wall-lightbox__card--index::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--sj-accent, #8a4132);
  opacity: 0.72;
}

.wall-lightbox__head {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.7rem 0.8rem 0.5rem;
  border-bottom: 1px dashed rgb(92 72 48 / 22%);
}

.wall-lightbox__date {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.34rem;
  min-width: 0;
  padding-bottom: 0.2rem;
  font-family: var(--font-family-display);
}

.wall-lightbox__date::after {
  content: '';
  position: absolute;
  right: 0.1rem;
  bottom: 0;
  left: 0.1rem;
  height: 3px;
  pointer-events: none;
  opacity: 0.55;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='3'%3E%3Cpath d='M0 1.6 Q2.5 0.6 5 1.6 T10 1.6' fill='none' stroke='%23705c44' stroke-opacity='.4' stroke-width='.7' stroke-dasharray='2 1.4'/%3E%3C/svg%3E");
  background-repeat: repeat-x;
}

.wall-lightbox__stamp {
  overflow: hidden;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #3a2f25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wall-lightbox__weekday,
.wall-lightbox__clock {
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  color: rgb(70 56 40 / 55%);
  white-space: nowrap;
}

.wall-lightbox__clock {
  margin-left: auto;
}

.wall-lightbox__close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
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
  width: 0.82rem;
  height: 0.82rem;
}

.wall-lightbox__scroll {
  position: relative;
  z-index: 1;
  flex: 0 1 auto;
  min-height: 0;
  padding: 0.65rem 0.8rem 0.5rem;
  overflow: hidden;
}

.wall-lightbox__media {
  margin-bottom: 0.7rem;
  max-height: 30dvh;
  overflow: hidden;
}

.wall-lightbox__media :deep(*) {
  max-height: 30dvh;
}

.wall-lightbox__prose {
  max-height: 52dvh;
  overflow: hidden;
  font-family: var(--font-family-display);
  font-size: 0.82rem;
  line-height: 1.8;
  color: #332b23;
  mask-image: linear-gradient(to bottom, #000 94%, transparent);
}

.wall-lightbox__prose :deep(img) {
  max-height: 28dvh;
  width: auto;
  max-width: 100%;
  object-fit: contain;
}

.wall-lightbox__prose :deep(.echo-markdown p),
.wall-lightbox__prose :deep(.echo-markdown li),
.wall-lightbox__prose :deep(.echo-markdown blockquote p) {
  text-decoration: underline wavy rgb(90 70 45 / 20%);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.wall-lightbox__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.8rem;
  padding-top: 0.55rem;
  border-top: 1px dashed rgb(92 72 48 / 20%);
  font-family: var(--font-family-display);
  font-size: 0.58rem;
  letter-spacing: 0.04em;
  color: rgb(70 56 40 / 58%);
}

.wall-lightbox__foot {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.8rem 0.6rem;
  border-top: 1px dashed rgb(92 72 48 / 20%);
}

.wall-lightbox__detail {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.24rem;
  padding: 0.24rem 0.45rem;
  border: 1px solid transparent;
  border-radius: 1px;
  background: transparent;
  font-family: var(--font-family-display);
  font-size: 0.62rem;
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
  width: 0.68rem;
  height: 0.68rem;
  transition: transform 200ms ease;
}

.wall-lightbox__detail:hover .wall-lightbox__detail-icon {
  transform: translate(1px, -1px);
}

.wall-lightbox-enter-active .wall-lightbox__card,
.wall-lightbox-leave-active .wall-lightbox__card {
  transition:
    transform 540ms cubic-bezier(0.2, 0.9, 0.25, 1.06),
    box-shadow 540ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
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

.wall-lightbox-enter-from,
.wall-lightbox-leave-to {
  opacity: 0;
}

.wall-lightbox-enter-from .wall-lightbox__card,
.wall-lightbox-leave-to .wall-lightbox__card {
  opacity: 0.4;
  box-shadow:
    0 1px 1px rgb(40 27 16 / 14%),
    0 8px 16px -12px rgb(30 20 10 / 55%);
  transform: translate(var(--from-x), var(--from-y)) rotate(var(--from-rotate)) scale(var(--from-scale));
}

.wall-lightbox-enter-from .wall-lightbox__scroll,
.wall-lightbox-leave-to .wall-lightbox__scroll {
  opacity: 0;
}

.wall-lightbox-enter-active .wall-lightbox__scroll {
  transition: opacity 200ms ease 80ms;
}

.wall-lightbox-leave-active .wall-lightbox__scroll {
  transition: opacity 120ms ease;
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
  .wall-lightbox__head {
    padding: 0.65rem 0.7rem 0.45rem;
  }

  .wall-lightbox__scroll {
    padding: 0.55rem 0.7rem 0.4rem;
  }

  .wall-lightbox__foot {
    padding: 0.4rem 0.7rem 0.5rem;
  }
}
</style>
