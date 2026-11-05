<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div ref="feedRoot" class="desk-feed" :class="{ 'desk-feed--compact': compact }">
    <TheOnboardingChecklist v-if="showChecklist" />
    <TheFirstEchoCard v-if="showFirstEchoCard" @dismiss="dismissFirstEchoCard" />

    <section v-for="(group, groupIndex) in dayGroups" :key="group.key" class="day-cluster">
      <aside class="day-tab">
        <span class="day-tab__hole" aria-hidden="true"></span>
        <span class="day-tab__month">{{ group.monthLabel }}</span>
        <span class="day-tab__day">{{ group.dayLabel }}</span>
        <span class="day-tab__week">{{ group.weekdayLabel }}</span>
        <span v-if="group.isToday" class="day-tab__today">
          <span class="day-tab__today-dot" aria-hidden="true"></span>
          {{ t('starJournal.today') }}
        </span>

        <svg class="day-tab__constellation" viewBox="0 0 76 30" fill="none" aria-hidden="true">
          <path
            class="day-tab__constellation-line"
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
            :r="pointIndex === group.points.length - 1 ? 1.3 : 0.85"
            fill="currentColor"
          />
        </svg>

        <span class="day-tab__count">
          {{ t('starJournal.lettersCount', { count: group.echoes.length }) }}
        </span>
      </aside>

      <div class="day-board">
        <TheEchoCard
          v-for="(echo, echoIndex) in group.echoes"
          :key="echo.id"
          :echo="echo"
          :index="echoIndex"
          :featured="echoIndex === 0"
          :drop-cap="groupIndex === 0 && echoIndex === 0"
          :letter-no="formatLetterNo(echoIndex)"
          :note-style="noteMeta(echo, echoIndex).style"
          :fastener="noteMeta(echo, echoIndex).fastener"
          :tilt="noteMeta(echo, echoIndex).tilt"
          :offset="noteMeta(echo, echoIndex).offset"
          :wide="noteMeta(echo, echoIndex).wide"
          :data-note-id="echo.id"
          :style="{
            animationDelay: `${Math.min(echoIndex, 5) * 80}ms`,
            '--note-rows': rowSpans[echo.id] || 1,
          }"
          @refresh="handleRefresh"
        />
      </div>
    </section>

    <Transition name="fade">
      <div v-if="feedLoading" class="desk-feed__status">
        <TheLoadingIndicator size="lg" :label="t('homeFeed.loading')" />
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="!showChecklist && !feedLoading && feedTotal === 0" class="desk-feed__empty">
        <span class="desk-feed__empty-mark" aria-hidden="true">· · ·</span>
        <p>{{ isFiltering ? t('homeFeed.noMoreFiltered') : t('homeFeed.noMore') }}</p>
      </div>
    </Transition>

    <div v-if="!isDemo" ref="sentinel" class="desk-feed__sentinel" aria-hidden="true"></div>

    <Transition name="fade">
      <div v-if="!isDemo && canLoadMore && !feedLoading" class="desk-feed__more-wrap">
        <button type="button" class="desk-feed__more" @click="handleLoadMore">
          <span class="desk-feed__more-rule" aria-hidden="true"></span>
          <span>{{ t('starJournal.continued') }}</span>
          <span class="desk-feed__more-rule" aria-hidden="true"></span>
        </button>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="feedTotal > 0 && !feedLoading && !canLoadMore" class="desk-feed__end">
        <span class="desk-feed__end-rule" aria-hidden="true"></span>
        <span class="desk-feed__end-mark" aria-hidden="true">·</span>
        <span>{{ t('starJournal.end') }}</span>
        <span class="desk-feed__end-mark" aria-hidden="true">·</span>
        <span class="desk-feed__end-rule" aria-hidden="true"></span>
      </div>
    </Transition>

    <div v-if="footerContent" class="desk-feed__footer">
      <a v-if="footerLink" :href="footerLink" target="_blank" rel="noopener noreferrer">
        {{ footerContent }}
      </a>
      <span v-else>{{ footerContent }}</span>
    </div>

    <Transition name="fade">
      <button
        v-if="showBackToTop"
        type="button"
        class="desk-feed__totop"
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
import { getEchoFilesBy } from '@/utils/echo'

type Echo = App.Api.Ech0.Echo
type StarPoint = { x: number; y: number }
type NoteStyle = 'plain' | 'ruled' | 'grid' | 'kraft' | 'trace'
type Fastener = 'tape' | 'pin' | 'staple'

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

type NoteMeta = {
  style: NoteStyle
  fastener: Fastener
  tilt: number
  offset: number
  wide: boolean
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

/* ── deterministic collage metadata ──────────────────────────────────── */

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

const NOTE_STYLES: NoteStyle[] = ['plain', 'ruled', 'grid', 'kraft', 'trace']
const FASTENERS: Fastener[] = ['tape', 'pin', 'staple']
const TILTS = [-1.35, 0.85, -0.65, 1.15, -0.95, 0.45]
const OFFSETS = [0, 9, 3, 13, 5, 7]

const hasVisual = (echo: Echo) => {
  const files = getEchoFilesBy(echo, { categories: ['image', 'audio', 'video'] })
  return files.length > 0
}

const noteMetaMap = computed(() => {
  const map = new Map<string, NoteMeta>()
  for (const echo of feedEchoes.value) {
    const hash = hashString(echo.id)
    const random = mulberry32(hash)
    const wide =
      echo.content.length > 280 ||
      hasVisual(echo) ||
      echo.extension?.type === 'VIDEO' ||
      echo.extension?.type === 'MUSIC'
    map.set(echo.id, {
      style: NOTE_STYLES[hash % NOTE_STYLES.length] ?? 'plain',
      fastener: FASTENERS[(hash >>> 5) % FASTENERS.length] ?? 'tape',
      tilt: TILTS[(hash >>> 9) % TILTS.length] ?? 0,
      offset: Math.round(random() * OFFSETS[(hash >>> 13) % OFFSETS.length]!),
      wide,
    })
  }
  return map
})

const noteMeta = (echo: Echo, echoIndex: number): NoteMeta => {
  const meta = noteMetaMap.value.get(echo.id)
  return {
    style: meta?.style ?? 'plain',
    fastener: meta?.fastener ?? 'tape',
    tilt: meta?.tilt ?? 0,
    offset: meta?.offset ?? 0,
    wide: echoIndex === 0 || Boolean(meta?.wide),
  }
}

/* ── day grouping & little constellations ─────────────────────────────── */

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

/* ── masonry row spans ────────────────────────────────────────────────── */

const feedRoot = ref<HTMLElement | null>(null)
const rowSpans = ref<Record<string, number>>({})

const ROW_HEIGHT = 8
const ROW_GAP = 14
let noteObserver: ResizeObserver | null = null
let measureRaf: number | null = null

const measureNotes = () => {
  const root = feedRoot.value
  if (!root) return
  const next: Record<string, number> = {}
  let changed = false

  root.querySelectorAll<HTMLElement>('[data-note-id]').forEach((element) => {
    const id = element.dataset.noteId
    if (!id) return
    const rows = Math.max(1, Math.ceil((element.offsetHeight + ROW_GAP) / (ROW_HEIGHT + ROW_GAP)))
    next[id] = rows
    if (rowSpans.value[id] !== rows) changed = true
  })

  if (changed) rowSpans.value = next
}

const scheduleMeasure = () => {
  if (measureRaf !== null) return
  measureRaf = window.requestAnimationFrame(() => {
    measureRaf = null
    measureNotes()
  })
}

const observeNotes = async () => {
  await nextTick()
  noteObserver?.disconnect()
  noteObserver = null
  if (typeof ResizeObserver === 'undefined') {
    scheduleMeasure()
    return
  }
  noteObserver = new ResizeObserver(scheduleMeasure)
  feedRoot.value?.querySelectorAll<HTMLElement>('[data-note-id]').forEach((element) => {
    noteObserver?.observe(element)
  })
  scheduleMeasure()
}

watch(
  () => feedEchoes.value.map((echo) => echo.id).join('|'),
  () => {
    void observeNotes()
  },
)

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

  void observeNotes()

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
  noteObserver?.disconnect()
  noteObserver = null
  if (measureRaf !== null) {
    window.cancelAnimationFrame(measureRaf)
    measureRaf = null
  }
  const scrollHost = props.scrollTarget
  if (scrollHost) {
    scrollHost.removeEventListener('scroll', handleScroll)
  } else {
    window.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>
.desk-feed {
  position: relative;
  padding-inline: 0.1rem;
  padding-bottom: 1.5rem;
}

.desk-feed--compact {
  padding-inline: 0;
}

.day-cluster {
  display: grid;
  grid-template-columns: 5.2rem minmax(0, 1fr);
  gap: 1.05rem;
  margin-bottom: 2rem;
}

.day-tab {
  position: sticky;
  top: 1.1rem;
  align-self: start;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.12rem;
  padding: 0.8rem 0.6rem 0.7rem;
  color: var(--sj-ink-3, #928c84);
  background: color-mix(in srgb, var(--sj-paper, #fbfaf7) 58%, transparent);
  border: 1px solid var(--sj-line, #d9d3ca);
  border-radius: 1px;
  box-shadow: 0 10px 20px -22px color-mix(in srgb, var(--sj-ink, #292622) 55%, transparent);
  transform: rotate(-0.5deg);
  user-select: none;
}

.day-tab__hole {
  width: 0.42rem;
  height: 0.42rem;
  margin-bottom: 0.3rem;
  border-radius: 50%;
  border: 1px solid var(--sj-line-strong, #c3bcb2);
  background: var(--sj-canvas, #ece9e3);
  box-shadow: inset 0 1px 1px color-mix(in srgb, var(--sj-ink, #292622) 14%, transparent);
}

.day-tab__month {
  font-family: var(--font-family-display);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.day-tab__day {
  margin-top: -0.08rem;
  font-family: var(--font-family-display);
  font-size: 1.62rem;
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: 0.01em;
  color: var(--sj-ink, #292622);
  font-variant-numeric: tabular-nums;
}

.day-tab__week {
  font-family: var(--font-family-display);
  font-size: 0.63rem;
  letter-spacing: 0.08em;
}

.day-tab__today {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  margin-top: 0.15rem;
  font-size: 0.56rem;
  letter-spacing: 0.12em;
  color: var(--sj-ink-2, #605b55);
}

.day-tab__today-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--sj-accent, #8a4132);
}

.day-tab__constellation {
  width: 4.35rem;
  height: 1.7rem;
  margin: 0.55rem 0 0.25rem;
  color: var(--sj-ink-3, #928c84);
  opacity: 0.9;
}

.day-tab__constellation-line {
  stroke-dasharray: 120;
  stroke-dashoffset: 120;
  animation: day-constellation-draw 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
}

.day-tab__count {
  font-family: var(--font-family-display);
  font-size: 0.58rem;
  line-height: 1.45;
  letter-spacing: 0.08em;
}

.day-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 8px;
  gap: 14px 16px;
  align-items: start;
  padding-top: 0.15rem;
}

.desk-feed__status,
.desk-feed__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1.9rem 1rem;
  text-align: center;
}

.desk-feed__empty {
  color: var(--sj-ink-3, #928c84);
  font-family: var(--font-family-display);
  font-size: 0.85rem;
  letter-spacing: 0.06em;
}

.desk-feed__empty-mark {
  color: var(--sj-line-strong, #c3bcb2);
  font-size: 0.8rem;
  letter-spacing: 0.35em;
}

.desk-feed__sentinel {
  width: 100%;
  height: 1px;
}

.desk-feed__more-wrap {
  display: flex;
  justify-content: center;
  padding: 0.4rem 0 0.6rem;
}

.desk-feed__more {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.35rem 0.25rem;
  font-family: var(--font-family-display);
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  color: var(--sj-ink-3, #928c84);
  transition: color 180ms ease;
}

.desk-feed__more:hover,
.desk-feed__more:focus-visible {
  color: var(--sj-ink, #292622);
  outline: none;
}

.desk-feed__more-rule {
  width: 2.2rem;
  height: 1px;
  background: currentcolor;
  opacity: 0.45;
}

.desk-feed__end {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 1.6rem 0 0.4rem;
  font-family: var(--font-family-display);
  font-size: 0.64rem;
  letter-spacing: 0.22em;
  color: var(--sj-ink-3, #928c84);
}

.desk-feed__end-rule {
  width: 2.4rem;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--sj-line-strong, #c3bcb2) 80%, transparent)
  );
}

.desk-feed__end-rule:last-child {
  transform: scaleX(-1);
}

.desk-feed__end-mark {
  color: var(--sj-line-strong, #c3bcb2);
  font-size: 0.8rem;
  letter-spacing: 0;
}

.desk-feed__footer {
  margin-top: 1.3rem;
  padding-top: 0.9rem;
  text-align: center;
  font-family: var(--font-family-display);
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: var(--sj-ink-3, #928c84);
  border-top: 1px dashed color-mix(in srgb, var(--sj-line-strong, #c3bcb2) 55%, transparent);
}

.desk-feed__footer a {
  color: inherit;
  text-decoration: none;
  transition: color 180ms ease;
}

.desk-feed__footer a:hover {
  color: var(--sj-ink, #292622);
}

.desk-feed__totop {
  position: fixed;
  right: 1.1rem;
  bottom: 1.2rem;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--sj-line-strong, #c3bcb2);
  border-radius: 50%;
  color: var(--sj-ink-2, #605b55);
  background: color-mix(in srgb, var(--sj-paper, #fbfaf7) 88%, transparent);
  box-shadow: 0 10px 24px -16px color-mix(in srgb, var(--sj-ink, #292622) 45%, transparent);
  font-family: var(--font-family-display);
  font-size: 0.82rem;
  backdrop-filter: blur(8px);
  transition:
    transform 200ms ease,
    background-color 200ms ease;
}

.desk-feed__totop:hover {
  transform: translateY(-2px);
  background: var(--sj-paper, #fbfaf7);
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
  .day-tab__constellation-line {
    animation: none;
    stroke-dashoffset: 0;
  }
}

@media (width <= 900px) {
  .day-cluster {
    grid-template-columns: 1fr;
    gap: 0.55rem;
    margin-bottom: 1.6rem;
  }

  .day-tab {
    position: static;
    flex-flow: row wrap;
    align-items: baseline;
    gap: 0.4rem;
    padding: 0.5rem 0.65rem;
    transform: rotate(-0.35deg);
  }

  .day-tab__hole {
    display: none;
  }

  .day-tab__day {
    font-size: 1.25rem;
  }

  .day-tab__constellation {
    width: 3.5rem;
    height: 1.35rem;
    margin: 0 0 0 auto;
  }

  .day-tab__count {
    display: none;
  }

  .day-board {
    grid-template-columns: 1fr;
    gap: 1.05rem;
  }
}

@media (width <= 480px) {
  .desk-feed {
    padding-inline: 0;
  }

  .day-tab {
    padding: 0.42rem 0.55rem;
  }
}
</style>
