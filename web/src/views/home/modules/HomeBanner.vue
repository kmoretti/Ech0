<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <section class="desk-hero" aria-label="Intro">
    <span class="desk-hero__clip" aria-hidden="true"></span>

    <div class="desk-hero__top">
      <p class="desk-hero__eyebrow">
        <span>{{ t('starJournal.eyebrow') }}</span>
        <span class="desk-hero__date">{{ dateLabel }}</span>
      </p>
      <span class="desk-hero__postmark" aria-hidden="true">
        <span>{{ t('starJournal.seal') }}</span>
        <span class="desk-hero__postmark-dot"></span>
      </span>
    </div>

    <p class="desk-hero__epigraph">{{ epigraph }}</p>
    <p class="desk-hero__tagline">{{ t('homeBio.tagline') }}</p>

    <div class="desk-hero__foot">
      <RouterLink
        :to="{ name: 'about' }"
        class="desk-hero__powered"
        :aria-label="t('about.linkAriaLabel')"
      >
        Powered by Ech0
      </RouterLink>

      <div class="desk-hero__trace" aria-hidden="true">
        <svg viewBox="0 0 132 40" fill="none">
          <path
            class="desk-hero__trace-line"
            d="M6 30 L28 18 L50 25 L74 10 L96 20 L124 7"
            stroke="currentColor"
            stroke-width="0.6"
            stroke-linecap="round"
          />
          <circle cx="6" cy="30" r="1.2" fill="currentColor" />
          <circle cx="28" cy="18" r="1.7" fill="currentColor" />
          <circle cx="50" cy="25" r="1" fill="currentColor" />
          <circle cx="74" cy="10" r="2" fill="currentColor" />
          <circle cx="96" cy="20" r="1.1" fill="currentColor" />
          <circle cx="124" cy="7" r="1.5" fill="currentColor" />
        </svg>
      </div>

      <RouterLink
        :to="{ name: 'about' }"
        class="desk-hero__about"
        :aria-label="t('about.linkAriaLabel')"
        :title="t('about.linkAriaLabel')"
      >
        <Exclamation class="desk-hero__about-icon" />
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
</script>

<style scoped>
.desk-hero {
  position: relative;
  margin: 0.35rem 0 1.25rem;
  padding: 1.15rem 1.25rem 0.95rem;
  color: var(--sj-ink, #292622);
  background-color: var(--sj-paper, #fbfaf7);
  border: 1px solid var(--sj-line, #d9d3ca);
  border-radius: 1px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--sj-ink, #292622) 4%, transparent),
    0 1px 2px color-mix(in srgb, var(--sj-ink, #292622) 5%, transparent),
    0 26px 40px -36px color-mix(in srgb, var(--sj-ink, #292622) 55%, transparent);
  transform: rotate(-0.28deg);
  animation: hero-settle 760ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.desk-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='170'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='170' height='170' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.desk-hero__clip {
  position: absolute;
  z-index: 2;
  top: -0.42rem;
  left: 1.6rem;
  width: 0.62rem;
  height: 1.45rem;
  border: 1.5px solid color-mix(in srgb, var(--sj-ink, #292622) 42%, transparent);
  border-radius: 0.4rem;
  transform: rotate(8deg);
  box-shadow: 0 2px 3px -2px color-mix(in srgb, var(--sj-ink, #292622) 35%, transparent);
}

.desk-hero__clip::after {
  content: '';
  position: absolute;
  inset: 0.18rem 0.12rem 0.22rem;
  border: 1px solid color-mix(in srgb, var(--sj-ink, #292622) 30%, transparent);
  border-radius: 0.3rem;
}

.desk-hero__top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.desk-hero__eyebrow {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.64rem;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--sj-ink-3, #928c84);
}

.desk-hero__date {
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--sj-ink-3, #928c84);
}

.desk-hero__postmark {
  position: relative;
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.22rem 0.45rem;
  border: 1px solid color-mix(in srgb, var(--sj-ink, #292622) 38%, transparent);
  border-radius: 1px;
  font-family: var(--font-family-display);
  font-size: 0.56rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--sj-ink-2, #605b55);
  transform: rotate(2deg);
}

.desk-hero__postmark::after {
  content: '';
  position: absolute;
  inset: 2px;
  border: 1px solid color-mix(in srgb, var(--sj-ink, #292622) 16%, transparent);
  pointer-events: none;
}

.desk-hero__postmark-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--sj-accent, #8a4132);
}

.desk-hero__epigraph {
  position: relative;
  max-width: 30rem;
  margin: 0.9rem 0 0;
  font-family: var(--font-family-display);
  font-size: clamp(1.32rem, 4.2vw, 1.6rem);
  font-weight: 560;
  line-height: 1.55;
  letter-spacing: 0.015em;
  color: var(--sj-ink, #292622);
  text-wrap: balance;
  animation: epigraph-in 1.1s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.desk-hero__epigraph::before {
  content: '「';
  position: absolute;
  top: -0.55rem;
  left: -0.88rem;
  font-size: 1.05rem;
  color: color-mix(in srgb, var(--sj-ink, #292622) 26%, transparent);
}

.desk-hero__tagline {
  margin: 0.55rem 0 0;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--sj-ink-3, #928c84);
}

.desk-hero__foot {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.95rem;
  padding-top: 0.7rem;
  border-top: 1px dashed color-mix(in srgb, var(--sj-line-strong, #c3bcb2) 70%, transparent);
}

.desk-hero__powered {
  font-family: var(--font-family-display);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--sj-ink-3, #928c84);
  text-decoration: none;
  transition: color 0.18s ease;
}

.desk-hero__powered:hover {
  color: var(--sj-ink, #292622);
}

.desk-hero__trace {
  flex: 1 1 auto;
  display: flex;
  justify-content: flex-end;
  color: var(--sj-ink-3, #928c84);
  opacity: 0.72;
}

.desk-hero__trace svg {
  width: 7.2rem;
  height: 2.2rem;
}

.desk-hero__trace-line {
  stroke-dasharray: 190;
  stroke-dashoffset: 190;
  animation: trace-draw 2.4s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
}

.desk-hero__about {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  color: var(--sj-ink-3, #928c84);
  text-decoration: none;
  outline: none;
  transition:
    color 0.18s ease,
    transform 0.18s ease;
}

.desk-hero__about:hover {
  color: var(--sj-ink, #292622);
  transform: translateY(-1px);
}

.desk-hero__about:focus-visible {
  color: var(--sj-ink, #292622);
  box-shadow: 0 0 0 2px var(--sj-line);
}

.desk-hero__about-icon {
  width: 0.9rem;
  height: 0.9rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

@keyframes trace-draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes epigraph-in {
  from {
    opacity: 0;
    filter: blur(3px);
    transform: translateY(5px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

@keyframes hero-settle {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: rotate(-1.4deg) translateY(10px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: rotate(-0.28deg) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .desk-hero,
  .desk-hero__epigraph,
  .desk-hero__trace-line {
    animation: none;
  }

  .desk-hero__trace-line {
    stroke-dashoffset: 0;
  }
}

@media (width <= 640px) {
  .desk-hero {
    padding: 1rem 0.95rem 0.8rem;
  }

  .desk-hero__epigraph {
    font-size: 1.24rem;
  }

  .desk-hero__trace {
    display: none;
  }
}
</style>
