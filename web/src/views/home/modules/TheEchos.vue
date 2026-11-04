<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="star-journal" :class="{ 'star-journal--compact': compact }">
    <TheOnboardingChecklist v-if="showChecklist" />
    <TheFirstEchoCard v-if="showFirstEchoCard" @dismiss="dismissFirstEchoCard" />

    <section v-for="(group, groupIndex) in dayGroups" :key="group.key" class="star-day">
      <header class="star-day__head">
        <div class="star-day__date">
          <span class="star-day__month">{{ group.monthLabel }}</span>
          <span class="star-day__day">{{ group.dayLabel }}</span>
          <span class="star-day__weekday">{{ group.weekdayLabel }}</span>
          <span v-if="group.isToday" class="star-day__today">{{ t('starJournal.today') }}</span>
        </div>

        <div class="star-day__trace" aria-hidden="true">
          <span class="star-day__rule"></span>
          <svg class="star-day__constellation" viewBox="0 0 76 30" fill="none">
            <path
              class="star-day__constellation-line"
              :d="group.path"
              stroke="currentColor"
              stroke-width="0.65"
              stroke-linecap="round"
            />
            <circle
              v-for="(point, pointIndex) in group.points"
              :key="pointIndex"
              :cx="point.x"
              :cy="point.y"
              :r="pointIndex === group.points.length - 1 ? 1.45 : 0.95"
              fill="currentColor"
            />
          </svg>
          <span class="star-day__count">
            {{ t('starJournal.lettersCount', { count: group.echoes.length }) }}
          </span>
        </div>
      </header>

      <div class="star-day__letters">
        <TheEchoCard
          v-for="(echo, echoIndex) in group.echoes"
          :key="echo.id"
          :echo="echo"
          :index="echoIndex"
          :featured="echoIndex === 0"
          :drop-cap="groupIndex === 0 && echoIndex === 0"
          :letter-no="formatLetterNo(echoIndex)"
          :style="{ animationDelay: `${Math.min(echoIndex, 6) * 70}ms` }"
          @refresh="handleRefresh"
        />
      </div>
    </section>

    <Transition name="fade">
      <div v-if="feedLoading" class="star-journal__status">
        <TheLoadingIndicator size="lg" :label="t('homeFeed.loading')" />
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="!showChecklist && !feedLoading && feedTotal === 0" class="star-journal__empty">
        <span class="star-journal__empty-mark" aria-hidden="true">✦</span>
        <p>{{ isFiltering ? t('homeFeed.noMoreFiltered') : t('homeFeed.noMore') }}</p>
      </div>
    </Transition>

    <div v-if="!isDemo" ref="sentinel" class="star-journal__sentinel" aria-hidden="true"></div>

    <Transition name="fade">
      <div v-if="!isDemo && canLoadMore && !feedLoading" class="star-journal__more-wrap">
        <button type="button" class="star-journal__more" @click="handleLoadMore">
          <span class="star-journal__more-rule" aria-hidden="true"></span>
          <span>{{ t('starJournal.continued') }}</span>
          <span class="star-journal__more-rule" aria-hidden="true"></span>
        </button>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="feedTotal > 0 && !feedLoading && !canLoadMore" class="star-journal__end">
        <span class="star-journal__end-rule" aria-hidden="true"></span>
        <span class="star-journal__end-mark" aria-hidden="true">✦</span>
        <span>{{ t('starJournal.end') }}</span>
        <span class="star-journal__end-mark" aria-hidden="true">✦</span>
        <span class="star-journal__end-rule" aria-hidden="true"></span>
      </div>
    </Transition>

    <div v-if="footerContent" class="star-journal__footer">
      <a v-if="footerLink" :href="footerLink" target="_blank" rel="noopener noreferrer">
        {{ footerContent }}
      </a>
      <span v-else>{{ footerContent }}</span>
    </div>

    <Transition name="fade">
      <button
        v-if="showBackToTop"
        type="button"
        class="star-journal__totop"
        :aria-label="t('starJournal.backToTop')"
        v-tooltip="t('starJournal.backToTop')"
        @click="scrollToTop"
      >
        <span aria-hidden="true">↑</span>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import TheEchoCard from '@/components/advanced/echo/cards/TheEchoCard.vue'
import TheFirstEchoCard from './TheFirstEchoCard.vue'
import TheOnboardingChecklist from './TheOnboardingChecklist.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEchoStore, useSettingStore, useUserStore } from '@/stores'
import { FIRST_ECHO_CARD_SEEN_KEY, shouldShowFirstEchoCard } from '@/composables/useSiteOnboarding'
import { useSiteChecklist } from '@/composables/useSiteChecklist'
import { localStg } from '@/utils/storage'
import TheLoadingIndicator from '@/components/common/TheLoadingIndicator.vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { timeValueToMs } from '@/utils/timeValue'

type Echo = App.Api.Ech0.Echo

type StarPoint = { x: number; y: number }

type DayGroup = {
  key: string
  monthLabel: string
  dayLabel: string
  weekdayLabel: string
  isToday: boolean
  echoes: Echo[]
  points: StarPoint[]
  path: string
}

const props = defineProps<{
  scrollTarget?: HTMLElement | null
  compact?: boolean
  demoEchoes?: Echo[]
}>()

const echoStore = useEchoStore()
const settingStore = useSettingStore()
const route = useRoute()
const { t, locale } = useI18n()
const userStore = useUserStore()
const { SystemSetting } = storeToRefs(settingStore)
const { isFilteringMode, hasActiveQuery } = storeToRefs(echoStore)
const { isLogin } = storeToRefs(userStore)

const isDemo = computed(() => Array.isArray(props.demoEchoes))
const isFiltering = computed(() => !isDemo.value && isFilteringMode.value)
const feedEchoes = computed<Echo[]>(() =>
  isDemo.value ? (props.demoEchoes ?? []) : echoStore.echoList,
)
const feedTotal = computed(() => (isDemo.value ? feedEchoes.value.length : echoStore.total))
const feedLoading = computed(() => (isDemo.value ? false : echoStore.isLoading))

const firstEchoSeen = ref(localStg.getItem<boolean>(FIRST_ECHO_CARD_SEEN_KEY) === true)
const { visible: checklistVisible } = useSiteChecklist()
const showChecklist = computed(() => !isDemo.value && checklistVisible.value)

const showFirstEchoCard = computed(() => {
  if (isDemo.value) return false
  const echo = feedEchoes.value[0]
  if (!echo) return false
  return shouldShowFirstEchoCard({
    isOwner: isLogin.value,
filtering: hasActiveQuery.value,
echoTotal: feedTotal.value,
    firstEchoPrivate: echo.private === true,
    dismissed: firstEchoSeen.value,
  })
})

const dismissFirstEchoCard = () => {
  firstEchoSeen.value = true
  localStg.setItem(FIRST_ECHO_CARD_SEEN_KEY, true)
}

const footerContent = computed(
  () => SystemSetting.value.footer_content || SystemSetting.value.ICP_number,
)
const footerLink = computed(() => SystemSetting.value.footer_link)

/* ── day grouping & little constellations ─────────────────────────────── */

const hashString = (value: string): number => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  }
  return hash >>> 0
}

const mulberry32 = (seed: number) => {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const buildConstellation = (key: string, letterCount: number): StarPoint[] => {
  const random = mulberry32(hashString(key))
  const pointCount = Math.max(3, Math.min(6, letterCount + 1))
  const points = Array.from({ length: pointCount }, (_, index) => {
    const progress = pointCount === 1 ? 0.5 : index / (pointCount - 1)
    return {
      x: 7 + progress * 62 + (random() - 0.5) * 5,
      y: 5 + random() * 20,
    }
  })
  return points.sort((left, right) => left.x - right.x)
}

const constellationPath = (points: StarPoint[]) =>
  points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')

const monthFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { month: 'short' }))
const weekdayFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }))

const dayGroups = computed<DayGroup[]>(() => {
  const groups = new Map<string, { date: Date; echoes: Echo[] }>()

  for (const echo of feedEchoes.value) {
    const ms = timeValueToMs(echo.created_at)
    const date = new Date(ms > 0 ? ms : Date.now())
    const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
    const existing = groups.get(key)
    if (existing) {
      existing.echoes.push(echo)
    } else {
      groups.set(key, { date, echoes: [echo] })
    }
  }

  const today = new Date()
  return Array.from(groups.entries()).map(([key, group]) => {
    const points = buildConstellation(key, group.echoes.length)
    return {
      key,
      monthLabel: monthFormatter.value.format(group.date),
      dayLabel: String(group.date.getDate()).padStart(2, '0'),
      weekdayLabel: weekdayFormatter.value.format(group.date),
      isToday:
        group.date.getFullYear() === today.getFullYear() &&
        group.date.getMonth() === today.getMonth() &&
        group.date.getDate() === today.getDate(),
      echoes: group.echoes,
      points,
      path: constellationPath(points),
    }
  })
})

const formatLetterNo = (index: number) => String(index + 1).padStart(2, '0')

/* ── infinite scroll ──────────────────────────────────────────────────── */

const sentinel = ref<HTMLElement | null>(null)
const sentinelVisible = ref(false)
const showBackToTop = ref(false)
let observer: IntersectionObserver | null = null

const canLoadMore = computed(() => !isDemo.value && echoStore.currentPage < echoStore.totalPages)

const handleLoadMore = async () => {
  if (!canLoadMore.value || echoStore.isLoading) return
  await echoStore.loadNextPage()
}

const fillViewport = async () => {
  if (!sentinelVisible.value || !canLoadMore.value || echoStore.isLoading) return
  const previousLength = echoStore.echoList.length
  await handleLoadMore()
  await nextTick()
  if (sentinelVisible.value && echoStore.echoList.length > previousLength) {
    void fillViewport()
  }
}

const scrollToTop = () => {
  const container = props.scrollTarget
  if (container) {
    container.scrollTo({ top: 0, behavior: 'smooth' })
  } else if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const handleScroll = () => {
  const scrollTop = props.scrollTarget
    ? props.scrollTarget.scrollTop
    : typeof window !== 'undefined'
      ? window.scrollY
      : 0
  showBackToTop.value = scrollTop > 560
}

const parsePageQuery = (raw: unknown): number => {
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
}

const handleRefresh = () => {
  if (!isDemo.value) echoStore.refreshEchos()
}

watch(
  () => route.query.page,
  async (raw) => {
    if (isDemo.value) return
    const target = parsePageQuery(raw)
    if (target === echoStore.currentPage) return
    await echoStore.goToPage(target)
    scrollToTop()
  },
)

watch(isFilteringMode, () => {
  if (isDemo.value) return
  echoStore.refreshEchos()
})

onMounted(async () => {
  const scrollHost = props.scrollTarget
  if (scrollHost) {
    scrollHost.addEventListener('scroll', handleScroll, { passive: true })
  } else {
    window.addEventListener('scroll', handleScroll, { passive: true })
  }

  if (isDemo.value) return

  const target = parsePageQuery(route.query.page)
  if (target > 1) {
    await echoStore.goToPage(target)
  } else {
    await echoStore.fetchCurrentPage()
  }

  if (typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      sentinelVisible.value = entries.some((entry) => entry.isIntersecting)
      if (sentinelVisible.value) void fillViewport()
    },
    {
      root: props.scrollTarget ?? null,
      rootMargin: '720px 0px',
      threshold: 0,
    },
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  const scrollHost = props.scrollTarget
  if (scrollHost) {
    scrollHost.removeEventListener('scroll', handleScroll)
  } else {
    window.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>
.star-journal {
  position: relative;
  padding-inline: 0.15rem;
  padding-bottom: 1.5rem;
}

.star-journal--compact {
  padding-inline: 0;
}

.star-day {
  position: relative;
  margin-bottom: 1.45rem;
}

.star-day__head {
  display: flex;
  align-items: flex-end;
  gap: 0.85rem;
  margin: 0.15rem 0 0.7rem;
  padding-left: 2.02rem;
  user-select: none;
}

.star-day__date {
  display: flex;
  align-items: baseline;
  gap: 0.38rem;
  flex: none;
  color: var(--sj-ink-3, #9a8d7e);
}

.star-day__month {
  font-family: var(--font-family-display);
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.star-day__day {
  font-family: var(--font-family-display);
  font-size: 1.62rem;
  font-weight: 600;
  line-height: 0.9;
  letter-spacing: 0.01em;
  color: var(--sj-ink, #2f251d);
  font-variant-numeric: tabular-nums;
}

.star-day__weekday {
  font-family: var(--font-family-display);
  font-size: 0.66rem;
  letter-spacing: 0.08em;
}

.star-day__today {
  padding: 0.04rem 0.3rem;
  border: 1px solid color-mix(in srgb, var(--sj-accent, #b84200) 42%, transparent);
  border-radius: 2px;
  color: var(--sj-accent, #b84200);
  font-family: var(--font-family-display);
  font-size: 0.56rem;
  letter-spacing: 0.14em;
  line-height: 1.2;
}

.star-day__trace {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: 1 1 auto;
  min-width: 0;
  padding-bottom: 0.28rem;
  color: var(--sj-gold, #b08a3e);
}

.star-day__rule {
  flex: 1 1 auto;
  height: 1px;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--sj-line-strong, #d5c7b4) 85%, transparent),
    color-mix(in srgb, var(--sj-line, #e6ddcf) 18%, transparent)
  );
}

.star-day__constellation {
  width: 4.9rem;
  height: 1.8rem;
  flex: none;
  opacity: 0.95;
}

.star-day__constellation-line {
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  animation: day-constellation-draw 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
}

.star-day__count {
  flex: none;
  font-family: var(--font-family-display);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: var(--sj-ink-3, #9a8d7e);
}

.star-day__letters {
  display: flex;
  flex-direction: column;
  gap: 0.62rem;
}

.star-journal__status,
.star-journal__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1.9rem 1rem;
  text-align: center;
}

.star-journal__empty {
  color: var(--sj-ink-3, #9a8d7e);
  font-family: var(--font-family-display);
  font-size: 0.88rem;
  letter-spacing: 0.06em;
}

.star-journal__empty-mark {
  color: color-mix(in srgb, var(--sj-gold, #b08a3e) 65%, transparent);
  font-size: 0.85rem;
  letter-spacing: 0.4em;
}

.star-journal__sentinel {
  width: 100%;
  height: 1px;
}

.star-journal__more-wrap {
  display: flex;
  justify-content: center;
  padding: 0.4rem 0 0.6rem;
}

.star-journal__more {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.35rem 0.25rem;
  font-family: var(--font-family-display);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  color: var(--sj-ink-3, #9a8d7e);
  transition: color 180ms ease;
}

.star-journal__more:hover,
.star-journal__more:focus-visible {
  color: var(--sj-accent, #b84200);
  outline: none;
}

.star-journal__more-rule {
  width: 2.2rem;
  height: 1px;
  background: currentcolor;
  opacity: 0.45;
}

.star-journal__end {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 1.4rem 0 0.4rem;
  font-family: var(--font-family-display);
  font-size: 0.66rem;
  letter-spacing: 0.22em;
  color: var(--sj-ink-3, #9a8d7e);
}

.star-journal__end-rule {
  width: 2.4rem;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--sj-line-strong, #d5c7b4) 80%, transparent)
  );
}

.star-journal__end-rule:last-child {
  transform: scaleX(-1);
}

.star-journal__end-mark {
  color: color-mix(in srgb, var(--sj-gold, #b08a3e) 75%, transparent);
  font-size: 0.56rem;
  letter-spacing: 0;
}

.star-journal__footer {
  margin-top: 1.3rem;
  padding-top: 0.9rem;
  text-align: center;
  font-family: var(--font-family-display);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: var(--sj-ink-3, #9a8d7e);
  border-top: 1px dashed color-mix(in srgb, var(--sj-line-strong, #d5c7b4) 55%, transparent);
}

.star-journal__footer a {
  color: inherit;
  text-decoration: none;
  transition: color 180ms ease;
}

.star-journal__footer a:hover {
  color: var(--sj-accent, #b84200);
}

.star-journal__totop {
  position: fixed;
  right: 1.1rem;
  bottom: 1.2rem;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.3rem;
  height: 2.3rem;
  border: 1px solid color-mix(in srgb, var(--sj-accent, #b84200) 45%, transparent);
  border-radius: 50%;
  color: var(--sj-accent, #b84200);
  background: color-mix(in srgb, var(--sj-paper, #fffdf7) 88%, transparent);
  box-shadow: 0 10px 24px -14px color-mix(in srgb, var(--sj-ink, #2f251d) 55%, transparent);
  font-family: var(--font-family-display);
  font-size: 0.85rem;
  backdrop-filter: blur(8px);
  transition:
    transform 200ms ease,
    background-color 200ms ease;
}

.star-journal__totop:hover {
  transform: translateY(-2px);
  background: var(--sj-paper, #fffdf7);
}

@keyframes day-constellation-draw {
  to {
    stroke-dashoffset: 0;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.22s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .star-day__constellation-line {
    animation: none;
    stroke-dashoffset: 0;
  }
}

@media (width <= 480px) {
  .star-day__head {
    padding-left: 1.47rem;
    gap: 0.55rem;
  }

  .star-day__constellation {
    width: 3.4rem;
  }

  .star-day__count {
    display: none;
  }

  .star-day__day {
    font-size: 1.4rem;
  }
}
</style>
