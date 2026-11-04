<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <section class="star-hero" aria-label="Intro">
    <div class="star-hero__sky" aria-hidden="true">
      <span
        v-for="(star, index) in skyStars"
        :key="index"
        class="star-hero__star"
        :style="star"
      ></span>
      <svg class="star-hero__constellation" viewBox="0 0 132 52" fill="none">
        <path
          class="star-hero__constellation-line"
          d="M8 38 L30 22 L52 30 L76 12 L98 24 L124 9"
          stroke="currentColor"
          stroke-width="0.7"
          stroke-linecap="round"
        />
        <circle cx="8" cy="38" r="1.5" fill="currentColor" />
        <circle cx="30" cy="22" r="2.1" fill="currentColor" />
        <circle cx="52" cy="30" r="1.2" fill="currentColor" />
        <circle cx="76" cy="12" r="2.4" fill="currentColor" />
        <circle cx="98" cy="24" r="1.4" fill="currentColor" />
        <circle cx="124" cy="9" r="1.8" fill="currentColor" />
      </svg>
      <span class="star-hero__shooting"></span>
    </div>

    <div class="star-hero__top">
      <p class="star-hero__eyebrow">
        <span class="star-hero__spark" aria-hidden="true">✦</span>
        <span>{{ t('starJournal.eyebrow') }}</span>
        <span class="star-hero__date">{{ dateLabel }}</span>
      </p>
      <span class="star-hero__seal" aria-hidden="true">{{ t('starJournal.seal') }}</span>
    </div>

    <p class="star-hero__epigraph">{{ epigraph }}</p>
    <p class="star-hero__tagline">{{ t('homeBio.tagline') }}</p>

    <div class="star-hero__foot">
      <RouterLink
        :to="{ name: 'about' }"
        class="star-hero__powered"
        :aria-label="t('about.linkAriaLabel')"
      >
        Powered by Ech0
      </RouterLink>
      <RouterLink
        :to="{ name: 'about' }"
        class="star-hero__about"
        :aria-label="t('about.linkAriaLabel')"
        :title="t('about.linkAriaLabel')"
      >
        <Exclamation class="star-hero__about-icon" />
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import Exclamation from '@/components/icons/exclamation.vue'

const { t, locale } = useI18n()

const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 0).getTime()

const dayOfYear = computed(() => {
  const now = new Date()
  return Math.floor((now.getTime() - startOfYear(now)) / 86_400_000)
})

const epigraphList = computed(() => [
  String(t('starJournal.epigraph1')),
  String(t('starJournal.epigraph2')),
  String(t('starJournal.epigraph3')),
  String(t('starJournal.epigraph4')),
  String(t('starJournal.epigraph5')),
  String(t('starJournal.epigraph6')),
])

const epigraph = computed(
  () => epigraphList.value[dayOfYear.value % epigraphList.value.length] ?? '',
)

const dateLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date()),
)

const skyStars = [
  { left: '8%', top: '22%', animationDelay: '-0.4s', animationDuration: '4.2s' },
  { left: '15%', top: '64%', animationDelay: '-1.7s', animationDuration: '5.1s' },
  { left: '24%', top: '14%', animationDelay: '-2.9s', animationDuration: '4.6s' },
  { left: '33%', top: '78%', animationDelay: '-0.9s', animationDuration: '5.4s' },
  { left: '42%', top: '36%', animationDelay: '-3.3s', animationDuration: '4.1s' },
  { left: '51%', top: '12%', animationDelay: '-1.2s', animationDuration: '5.8s' },
  { left: '59%', top: '70%', animationDelay: '-2.2s', animationDuration: '4.8s' },
  { left: '68%', top: '28%', animationDelay: '-0.1s', animationDuration: '5.2s' },
  { left: '76%', top: '60%', animationDelay: '-3.8s', animationDuration: '4.4s' },
  { left: '84%', top: '18%', animationDelay: '-1.9s', animationDuration: '5.6s' },
  { left: '91%', top: '48%', animationDelay: '-2.6s', animationDuration: '4.9s' },
  { left: '96%', top: '74%', animationDelay: '-0.7s', animationDuration: '5.3s' },
]
</script>

<style scoped>
.star-hero {
  position: relative;
  overflow: hidden;
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  padding: 1.05rem 1.15rem 0.85rem;
  color: var(--sj-ink, #2f251d);
  background:
    radial-gradient(
      120% 140% at 100% 0%,
      color-mix(in srgb, var(--sj-gold, #b08a3e) 12%, transparent),
      transparent 55%
    ),
    linear-gradient(165deg, var(--sj-paper, #fffdf7), var(--sj-canvas, #f7f3ea) 115%);
  border: 1px solid var(--sj-line, #e6ddcf);
  border-radius: 3px 18px 3px 3px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--sj-ink, #2f251d) 4%, transparent),
    0 24px 50px -40px color-mix(in srgb, var(--sj-ink, #2f251d) 65%, transparent);
}

.star-hero::after {
  content: '';
  position: absolute;
  right: 1.15rem;
  bottom: 0.62rem;
  left: 1.15rem;
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    color-mix(in srgb, var(--sj-line-strong, #d5c7b4) 75%, transparent) 0 5px,
    transparent 5px 10px
  );
  pointer-events: none;
}

.star-hero__sky {
  position: absolute;
  inset: 0;
  pointer-events: none;
  color: var(--sj-gold, #b08a3e);
}

.star-hero__star {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: currentcolor;
  opacity: 0.55;
  animation: star-twinkle 5s ease-in-out infinite;
}

.star-hero__constellation {
  position: absolute;
  top: 0.6rem;
  right: 1.1rem;
  width: 5.4rem;
  opacity: 0.34;
  color: var(--sj-gold, #b08a3e);
}

.star-hero__constellation-line {
  stroke-dasharray: 180;
  stroke-dashoffset: 180;
  animation: constellation-draw 2.6s cubic-bezier(0.22, 1, 0.36, 1) 0.25s forwards;
}

.star-hero__shooting {
  position: absolute;
  top: 18%;
  left: -12%;
  width: 5.5rem;
  height: 1px;
  opacity: 0;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--sj-gold, #b08a3e) 70%, white),
    white
  );
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--sj-gold, #b08a3e) 60%, transparent));
  transform: rotate(16deg);
  animation: star-shoot 9.5s cubic-bezier(0.3, 0, 0.55, 1) 2.4s infinite;
}

.star-hero__top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.star-hero__eyebrow {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.45rem;
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--sj-ink-3, #9a8d7e);
}

.star-hero__spark {
  color: var(--sj-gold, #b08a3e);
  font-size: 0.72rem;
  letter-spacing: 0;
}

.star-hero__date {
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--sj-ink-3, #9a8d7e);
}

.star-hero__seal {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 2.35rem;
  padding: 0.2rem;
  border: 1px solid color-mix(in srgb, var(--sj-accent, #b84200) 72%, transparent);
  border-radius: 2px;
  color: var(--sj-accent, #b84200);
  font-family: var(--font-family-display);
  font-size: 0.58rem;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: 0.12em;
  text-align: center;
  writing-mode: vertical-rl;
  background: color-mix(in srgb, var(--sj-accent, #b84200) 5%, transparent);
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--sj-accent, #b84200) 18%, transparent);
  transform: rotate(2.5deg);
}

.star-hero__epigraph {
  position: relative;
  max-width: 26rem;
  margin: 0.85rem 0 0;
  font-family: var(--font-family-display);
  font-size: clamp(1.32rem, 4.4vw, 1.62rem);
  font-weight: 560;
  line-height: 1.55;
  letter-spacing: 0.015em;
  color: var(--sj-ink, #2f251d);
  text-wrap: balance;
  animation: epigraph-in 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.star-hero__epigraph::before {
  content: '「';
  position: absolute;
  top: -0.55rem;
  left: -0.9rem;
  font-size: 1.1rem;
  color: color-mix(in srgb, var(--sj-accent, #b84200) 38%, transparent);
}

.star-hero__tagline {
  margin: 0.55rem 0 0;
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  color: var(--sj-ink-3, #9a8d7e);
}

.star-hero__foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.9rem;
  padding-bottom: 0.55rem;
}

.star-hero__powered {
  font-family: var(--font-family-display);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--sj-ink-3, #9a8d7e);
  text-decoration: none;
  transition: color 0.18s ease;
}

.star-hero__powered:hover {
  color: var(--sj-accent, #b84200);
}

.star-hero__about {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  color: var(--sj-ink-3, #9a8d7e);
  text-decoration: none;
  outline: none;
  transition:
    color 0.18s ease,
    transform 0.18s ease;
}

.star-hero__about:hover {
  color: var(--sj-accent, #b84200);
  transform: translateY(-1px);
}

.star-hero__about:focus-visible {
  color: var(--sj-accent, #b84200);
  box-shadow: 0 0 0 2px var(--color-accent-soft);
}

.star-hero__about-icon {
  width: 1rem;
  height: 1rem;
  font-size: 1rem;
  opacity: 0.75;
}

@keyframes star-twinkle {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(0.85);
  }

  50% {
    opacity: 0.75;
    transform: scale(1.15);
  }
}

@keyframes constellation-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes star-shoot {
  0%,
  86% {
    opacity: 0;
    transform: translate(0, 0) rotate(16deg);
  }

  88% {
    opacity: 0.9;
  }

  96% {
    opacity: 0;
    transform: translate(20rem, 5.6rem) rotate(16deg);
  }

  100% {
    opacity: 0;
    transform: translate(20rem, 5.6rem) rotate(16deg);
  }
}

@keyframes epigraph-in {
  from {
    opacity: 0;
    filter: blur(4px);
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .star-hero__star,
  .star-hero__constellation-line,
  .star-hero__shooting,
  .star-hero__epigraph {
    animation: none;
  }

  .star-hero__constellation-line {
    stroke-dashoffset: 0;
  }
}

@media (width <= 480px) {
  .star-hero {
    padding: 0.95rem 0.95rem 0.75rem;
    border-radius: 2px 14px 2px 2px;
  }

  .star-hero__epigraph {
    font-size: 1.28rem;
  }
}
</style>
