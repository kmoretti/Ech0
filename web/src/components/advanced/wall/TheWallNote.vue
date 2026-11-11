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

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import Lock from '@/components/icons/lock.vue'
import Open from '@/components/icons/open.vue'
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
  color: #2b2621;
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
  background-color: #f5efe2;
  background-image:
    radial-gradient(circle at 18% 10%, rgb(255 255 255 / 55%), transparent 42%),
    radial-gradient(circle at 80% 92%, rgb(92 68 42 / 5%), transparent 55%);
  border: 1px solid rgb(96 74 50 / 24%);
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
  color: rgb(74 62 48 / 72%);
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
  color: rgb(74 62 48 / 52%);
}

.wall-note__clock {
  margin-left: auto;
  color: rgb(74 62 48 / 42%);
  font-variant-numeric: tabular-nums;
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
  color: rgb(60 50 40 / 82%);
  text-decoration: underline wavy rgb(90 70 45 / 18%);
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
  color: rgb(74 62 48 / 48%);
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
  --color-border-subtle: rgb(96 74 50 / 26%);
  --color-border-strong: rgb(96 74 50 / 42%);
  --color-bg-muted: rgb(70 56 40 / 6%);
  --color-text-muted: rgb(74 62 48 / 62%);
  --color-text-primary: #2b2621;

  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  margin-top: 0.12rem;
  padding: 0.16rem 0.72rem 0.46rem;
  border-top: 1px dashed rgb(92 72 48 / 18%);
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
  color: rgb(74 62 48 / 58%);
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.wall-note__detail:hover {
  border-color: rgb(92 72 48 / 26%);
  background: rgb(70 56 40 / 5%);
  color: #2b2621;
}

.wall-note__detail:focus-visible {
  outline: 2px solid #3a2f24;
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

  border-color: rgb(92 104 118 / 26%);
  background-color: #f7f2e7;
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0 1.32rem,
      rgb(92 104 118 / 13%) 1.32rem calc(1.32rem + 1px)
    ),
    radial-gradient(circle at 18% 10%, rgb(255 255 255 / 55%), transparent 42%);
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

  border-color: rgb(96 92 70 / 26%);
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

.wall-note--kraft .wall-note__sheet {
  --note-shadow:
    0 1px 1px rgb(60 36 12 / 20%), 0 10px 20px -14px rgb(62 38 14 / 58%),
    0 26px 40px -30px rgb(62 38 14 / 50%);
  --note-shadow-hover:
    0 1px 1px rgb(60 36 12 / 22%), 0 18px 30px -18px rgb(62 38 14 / 60%),
    0 36px 56px -34px rgb(62 38 14 / 52%);

  background-color: #c8a97e;
  background-image:
    radial-gradient(circle at 24% 12%, rgb(255 245 220 / 28%), transparent 46%),
    radial-gradient(circle at 86% 90%, rgb(88 58 28 / 12%), transparent 52%);
  border-color: rgb(70 48 24 / 36%);
}

.wall-note--kraft .wall-note__date,
.wall-note--kraft .wall-note__foot {
  color: rgb(54 38 20 / 78%);
}

.wall-note--kraft .wall-note__text {
  color: rgb(44 30 14 / 94%);
  text-decoration-color: rgb(70 44 18 / 26%);
}

.wall-note--torn .wall-note__sheet {
  --note-shadow: none;
  --note-shadow-hover: none;

  border: 1px solid rgb(96 74 50 / 20%);
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

  background-color: #fbfaf4;
  border-color: rgb(84 70 52 / 28%);
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0 1.22rem,
      rgb(84 94 112 / 10%) 1.22rem calc(1.22rem + 1px)
    ),
    radial-gradient(circle at 20% 8%, rgb(255 255 255 / 60%), transparent 40%);
}

.wall-note--index .wall-note__sheet::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--sj-accent, #8a4132);
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
  outline: 2px solid #3a2f24;
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
