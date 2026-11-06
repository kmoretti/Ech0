<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <button
    type="button"
    class="wall-note"
    :class="[
      `wall-note--${paper}`,
      `wall-note--${size}`,
      `wall-note--fastener-${fastener}`,
      {
        'wall-note--featured': featured,
        'wall-note--image': !!imageUrl,
        'wall-note--flow': flow,
      },
    ]"
    :style="noteStyle"
    :aria-label="`${t('wall.openNote')}: ${dateParts.stamp} ${headline || excerpt}`"
    @click="emit('open', { echo, event: $event })"
  >
    <span class="wall-note__sheet">
      <span class="wall-note__grain" aria-hidden="true"></span>
      <span class="wall-note__fastener" aria-hidden="true"></span>

      <span class="wall-note__date">
        <span class="wall-note__stamp">{{ dateParts.stamp }}</span>
        <span class="wall-note__weekday">{{ dateParts.weekday }}</span>
        <span class="wall-note__clock">{{ dateParts.time }}</span>
      </span>

      <span v-if="imageUrl" class="wall-note__photo">
        <img :src="imageUrl" alt="" loading="lazy" decoding="async" />
      </span>

      <span class="wall-note__body">
        <span v-if="headline" class="wall-note__headline">{{ headline }}</span>
        <span class="wall-note__excerpt">{{ excerpt }}</span>
      </span>

      <span class="wall-note__foot">
        <span class="wall-note__tags">
          <span v-for="tag in tags.slice(0, 2)" :key="tag.id">#{{ tag.name }}</span>
        </span>
        <span v-if="echo.private" class="wall-note__private" aria-hidden="true">
          <Lock class="wall-note__lock" />
        </span>
        <span class="wall-note__mark" aria-hidden="true">↗</span>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Lock from '@/components/icons/lock.vue'
import { getEchoFiles } from '@/utils/echo'
import {
  wallDateStamp,
  wallHeadline,
  wallSnippet,
  type WallEcho,
  type WallFastener,
  type WallPaper,
} from '@/utils/wall'

type WallSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

const props = defineProps<{
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
}>()

const emit = defineEmits<{
  (event: 'open', payload: { echo: WallEcho; event: MouseEvent }): void
}>()

const { t } = useI18n()

const tags = computed(() => props.echo.tags ?? [])
const dateParts = computed(() => wallDateStamp(props.echo))
const headline = computed(() => wallHeadline(props.echo.content))
const excerpt = computed(() => {
  const snippet = wallSnippet(props.echo.content, props.size === 'xl' ? 240 : 170)
  if (!headline.value || !snippet.startsWith(headline.value)) return snippet
  return wallSnippet(snippet.slice(headline.value.length), 200)
})

const imageUrl = computed(() => {
  const file = getEchoFiles(props.echo).find((item) => item.category === 'image')
  return file?.url ?? ''
})

const noteStyle = computed(() => ({
  ...(props.flow
    ? {}
    : {
        width: `${props.width}px`,
        minHeight: `${props.height}px`,
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

.wall-note--flow .wall-note__sheet {
  height: auto;
  min-height: 8.6rem;
}

.wall-note--flow .wall-note__headline {
  font-size: 1.06rem;
  line-height: 1.46;
  -webkit-line-clamp: 3;
}

.wall-note--flow .wall-note__excerpt {
  --note-lines: 6;
  font-size: 0.82rem;
  line-height: 1.72;
}

.wall-note--flow .wall-note__date {
  padding-top: 0.85rem;
  font-size: 0.64rem;
}

.wall-note--flow .wall-note__foot {
  padding-bottom: 0.66rem;
  font-size: 0.62rem;
}

.wall-note--flow .wall-note__photo {
  height: 7rem;
}

.wall-note__sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  min-height: inherit;
  overflow: hidden;
  background-color: #f5efe2;
  background-image:
    radial-gradient(circle at 18% 10%, rgb(255 255 255 / 55%), transparent 42%),
    radial-gradient(circle at 80% 92%, rgb(92 68 42 / 5%), transparent 55%);
  border: 1px solid rgb(96 74 50 / 22%);
  border-radius: 1px;
  box-shadow:
    0 1px 1px rgb(40 27 16 / 13%),
    0 8px 16px -12px rgb(30 20 10 / 55%),
    0 22px 34px -28px rgb(30 20 10 / 50%);
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
  padding: 0.72rem 0.8rem 0;
  font-family: var(--font-family-display);
  font-size: 0.58rem;
  line-height: 1.2;
  letter-spacing: 0.04em;
  color: rgb(74 62 48 / 72%);
  white-space: nowrap;
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

.wall-note__photo {
  position: relative;
  z-index: 1;
  display: block;
  flex: 0 0 auto;
  margin: 0.5rem 0.72rem 0;
  overflow: hidden;
  background: #e7e0d2;
  border: 1px solid rgb(96 74 50 / 18%);
}

.wall-note__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.82) contrast(0.98);
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

.wall-note__headline {
  display: -webkit-box;
  flex: none;
  overflow: hidden;
  font-family: var(--font-family-display);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.38;
  letter-spacing: 0.01em;
  color: #2b2621;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.wall-note__excerpt {
  display: -webkit-box;
  flex: 0 1 auto;
  min-height: 0;
  overflow: hidden;
  font-family: var(--font-family-display);
  font-size: 0.68rem;
  line-height: 1.6;
  letter-spacing: 0.01em;
  color: rgb(60 50 40 / 78%);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--note-lines, 3);
}

.wall-note__foot {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.28rem 0.8rem 0.52rem;
  font-family: var(--font-family-display);
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

.wall-note__mark {
  margin-left: auto;
  font-size: 0.64rem;
  opacity: 0;
  transform: translate(-2px, 2px);
  transition:
    opacity 200ms ease,
    transform 260ms ease;
}

.wall-note__private + .wall-note__mark {
  margin-left: 0;
}

/* paper stocks */
.wall-note--ruled .wall-note__sheet {
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
  background-color: #c8a97e;
  background-image:
    radial-gradient(circle at 24% 12%, rgb(255 245 220 / 28%), transparent 46%),
    radial-gradient(circle at 86% 90%, rgb(88 58 28 / 12%), transparent 52%);
  border-color: rgb(70 48 24 / 28%);
}

.wall-note--kraft .wall-note__date,
.wall-note--kraft .wall-note__foot {
  color: rgb(54 38 20 / 78%);
}

.wall-note--kraft .wall-note__excerpt {
  color: rgb(44 30 14 / 94%);
}

.wall-note--kraft .wall-note__headline {
  color: #2c1e0e;
}

.wall-note--torn .wall-note__sheet {
  border: 0;
  border-radius: 0;
  clip-path: polygon(
    0% 2%,
    4% 0%,
    16% 1.4%,
    29% 0%,
    44% 1.2%,
    58% 0.2%,
    73% 1.6%,
    88% 0%,
    97% 1.8%,
    100% 12%,
    98.6% 28%,
    100% 44%,
    98.4% 62%,
    100% 78%,
    98.8% 92%,
    96% 100%,
    82% 98.6%,
    68% 100%,
    52% 98.4%,
    38% 100%,
    22% 98.6%,
    9% 100%,
    0% 96%,
    1.4% 80%,
    0% 63%,
    1.2% 47%,
    0% 31%
  );
  filter: drop-shadow(0 8px 12px rgb(40 26 14 / 22%));
}

.wall-note--torn .wall-note__sheet,
.wall-note--torn .wall-note__sheet * {
  box-shadow: none;
}

.wall-note--photo .wall-note__sheet {
  padding: 0.5rem 0.5rem 0.34rem;
  background-color: #fbf8f0;
  border-color: rgb(80 60 38 / 18%);
}

.wall-note--photo .wall-note__date {
  order: 3;
  padding: 0.22rem 0.24rem 0;
  font-size: 0.52rem;
}

.wall-note--photo .wall-note__photo {
  flex: 0 0 auto;
  margin: 0;
  aspect-ratio: 4 / 3;
}

.wall-note--photo .wall-note__body {
  order: 4;
  flex: 0 0 auto;
  padding: 0.3rem 0.24rem 0;
}

.wall-note--photo .wall-note__headline {
  font-size: 0.72rem;
  -webkit-line-clamp: 1;
}

.wall-note--photo .wall-note__excerpt {
  display: none;
}

.wall-note--photo .wall-note__foot {
  order: 5;
  padding: 0.22rem 0.24rem 0.16rem;
}

.wall-note--index .wall-note__sheet {
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

/* sizes */
.wall-note--xs .wall-note__headline {
  font-size: 0.74rem;
  -webkit-line-clamp: 1;
}

.wall-note--xs .wall-note__excerpt {
  --note-lines: 2;
  font-size: 0.6rem;
}

.wall-note--xs .wall-note__date,
.wall-note--xs .wall-note__foot {
  font-size: 0.5rem;
}

.wall-note--sm .wall-note__headline {
  -webkit-line-clamp: 1;
}

.wall-note--sm .wall-note__excerpt {
  --note-lines: 2;
}

.wall-note--md .wall-note__headline {
  -webkit-line-clamp: 2;
}

.wall-note--md .wall-note__excerpt {
  --note-lines: 2;
}

.wall-note--lg .wall-note__headline {
  font-size: 1.06rem;
}

.wall-note--lg .wall-note__headline {
  -webkit-line-clamp: 2;
}

.wall-note--lg .wall-note__excerpt {
  --note-lines: 3;
  font-size: 0.72rem;
}

.wall-note--xl .wall-note__headline {
  font-size: 1.28rem;
  -webkit-line-clamp: 3;
}

.wall-note--xl .wall-note__headline {
  -webkit-line-clamp: 2;
}

.wall-note--xl .wall-note__excerpt {
  --note-lines: 4;
  font-size: 0.78rem;
}

.wall-note--xl .wall-note__date {
  padding: 0.88rem 1rem 0;
  font-size: 0.62rem;
}

.wall-note--xl .wall-note__body {
  padding: 0.5rem 1rem 0;
}

.wall-note--xl .wall-note__foot {
  padding: 0.4rem 1rem 0.7rem;
  font-size: 0.6rem;
}

.wall-note--image .wall-note__excerpt {
  --note-lines: 2;
}

/* interaction */
@media (hover: hover) {
  .wall-note:hover {
    z-index: 999;
    transform: rotate(0deg) translateY(-6px) scale(1.035);
  }

  .wall-note:hover .wall-note__sheet {
    box-shadow:
      0 1px 1px rgb(40 27 16 / 14%),
      0 16px 26px -14px rgb(30 20 10 / 52%),
      0 34px 54px -30px rgb(30 20 10 / 55%);
  }

  .wall-note:hover .wall-note__mark {
    opacity: 0.72;
    transform: translate(0, 0);
  }
}

.wall-note:focus-visible {
  z-index: 1000;
  outline: 2px solid #3a2f24;
  outline-offset: 4px;
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
