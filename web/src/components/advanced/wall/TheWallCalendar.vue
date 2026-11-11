<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <section class="wall-calendar" aria-label="Calendar">
    <span class="wall-calendar__pin" aria-hidden="true"></span>

    <header class="wall-calendar__head">
      <button
        type="button"
        class="wall-calendar__nav"
        :aria-label="t('wall.previousMonth')"
        @click="shiftMonth(-1)"
      >
        <Arrow class="wall-calendar__nav-icon" />
      </button>

      <div class="wall-calendar__title-wrap">
        <h2 class="wall-calendar__title">{{ monthLabel }}</h2>
        <button
          v-if="selectedDate"
          type="button"
          class="wall-calendar__reset"
          @click="selectedDate = null"
        >
          {{ t('wall.all') }}
        </button>
      </div>

      <button
        type="button"
        class="wall-calendar__nav wall-calendar__nav--next"
        :aria-label="t('wall.nextMonth')"
        @click="shiftMonth(1)"
      >
        <Arrow class="wall-calendar__nav-icon" />
      </button>
    </header>

    <div class="wall-calendar__weekdays" aria-hidden="true">
      <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
    </div>

    <div class="wall-calendar__grid" role="grid">
      <template v-for="(week, weekIndex) in weeks" :key="weekIndex">
        <button
          v-for="(cell, cellIndex) in week"
          :key="`${weekIndex}-${cellIndex}`"
          type="button"
          class="wall-calendar__day"
          :class="{
            'is-empty': !cell,
            'is-marked': cell?.marked,
            'is-selected': cell?.key === selectedDate,
            'is-today': cell?.today,
          }"
          :disabled="!cell || !cell.marked"
          :aria-pressed="cell?.key === selectedDate"
          :aria-label="cell ? `${cell.key}${cell.marked ? '' : ' —'}` : undefined"
          @click="cell && toggleDay(cell.key, cell.marked)"
        >
          <span v-if="cell" class="wall-calendar__day-number">{{ cell.day }}</span>
          <span v-if="cell?.marked" class="wall-calendar__dot" aria-hidden="true"></span>
        </button>
      </template>
    </div>

    <footer class="wall-calendar__foot">
      <span class="wall-calendar__legend-dot" aria-hidden="true"></span>
      <span>{{ t('wall.hasNotes') }}</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Arrow from '@/components/icons/arrow.vue'

type Cell = { key: string; day: number; marked: boolean; today: boolean }

const props = defineProps<{
  marks: string[]
  selectedDate: string | null
  latestStamp?: number
}>()

const emit = defineEmits<{
  (event: 'update:selectedDate', value: string | null): void
}>()

const { t, locale } = useI18n()
const selectedDate = computed({
  get: () => props.selectedDate,
  set: (value: string | null) => emit('update:selectedDate', value),
})

const markedSet = computed(() => new Set(props.marks))
const today = new Date()
const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

const initialMonth = () => {
  if (props.latestStamp && Number.isFinite(props.latestStamp)) {
    return new Date(props.latestStamp)
  }
  return new Date()
}

const viewMonth = ref(new Date(initialMonth().getFullYear(), initialMonth().getMonth(), 1))

watch(
  () => props.latestStamp,
  (stamp) => {
    if (!stamp || Number.isFinite(stamp) === false) return
    viewMonth.value = new Date(new Date(stamp).getFullYear(), new Date(stamp).getMonth(), 1)
  },
  { once: true },
)

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'long' }).format(viewMonth.value),
)

const weekdayLabels = computed(() => {
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, 1 + index)
    return formatter.format(date)
  })
})

const weeks = computed<Cell[][]>(() => {
  const year = viewMonth.value.getFullYear()
  const month = viewMonth.value.getMonth()
  const first = new Date(year, month, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (Cell | null)[] = Array.from({ length: offset }, () => null)

  for (let day = 1; day <= days; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      key,
      day,
      marked: markedSet.value.has(key),
      today: key === todayKey,
    })
  }

  while (cells.length % 7 !== 0) cells.push(null)
  const result: Cell[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    result.push(cells.slice(index, index + 7) as Cell[])
  }
  return result
})

const shiftMonth = (delta: number) => {
  viewMonth.value = new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth() + delta, 1)
}

const toggleDay = (key: string, marked: boolean) => {
  if (!marked) return
  selectedDate.value = selectedDate.value === key ? null : key
}
</script>

<style scoped>
.wall-calendar {
  position: relative;
  padding: 1rem 0.95rem 0.85rem;
  color: var(--wall-ink-strong);
  background-color: var(--wall-cal-bg);
  background-image: var(--wall-cal-image);
  border: 1px solid rgb(var(--wall-line-rgb) / 24%);
  border-radius: 1px;
  box-shadow:
    0 1px 1px rgb(40 27 16 / 12%),
    0 18px 30px -24px rgb(30 20 10 / 58%);
  transform: rotate(-0.35deg);
}

.wall-calendar__pin {
  position: absolute;
  top: -0.36rem;
  left: 50%;
  width: 0.54rem;
  height: 0.54rem;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 28%, rgb(255 255 255 / 78%), transparent 34%),
    radial-gradient(circle at 50% 56%, #746352 0 46%, #413528 100%);
  box-shadow:
    0 1px 1px rgb(0 0 0 / 28%),
    0 4px 6px -3px rgb(0 0 0 / 40%);
  transform: translateX(-50%);
}

.wall-calendar__head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px dashed rgb(var(--wall-line-rgb) / 28%);
}

.wall-calendar__title-wrap {
  display: flex;
  flex: 1 1 auto;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
}

.wall-calendar__title {
  margin: 0;
  overflow: hidden;
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wall-calendar__reset {
  flex: none;
  padding: 0.1rem 0.34rem;
  border: 1px solid rgb(var(--wall-line-rgb) / 30%);
  border-radius: 1px;
  background: transparent;
  color: rgb(var(--wall-ink-soft-rgb) / 72%);
  font-size: 0.58rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.wall-calendar__reset:hover {
  border-color: rgb(var(--wall-ink-soft-rgb) / 52%);
  background: rgb(var(--wall-ink-soft-rgb) / 6%);
  color: var(--wall-ink-strong);
}

.wall-calendar__nav {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(var(--wall-ink-soft-rgb) / 58%);
  cursor: pointer;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.wall-calendar__nav:hover {
  background: rgb(var(--wall-ink-soft-rgb) / 7%);
  color: var(--wall-ink-strong);
}

.wall-calendar__nav:focus-visible,
.wall-calendar__reset:focus-visible {
  outline: 2px solid var(--wall-focus);
  outline-offset: 2px;
}

.wall-calendar__nav-icon {
  width: 0.78rem;
  height: 0.78rem;
  transform: rotate(180deg);
}

.wall-calendar__nav--next .wall-calendar__nav-icon {
  transform: none;
}

.wall-calendar__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.14rem;
  margin-top: 0.55rem;
  font-size: 0.54rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: center;
  color: rgb(var(--wall-ink-soft-rgb) / 46%);
}

.wall-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.14rem;
  margin-top: 0.28rem;
}

.wall-calendar__day {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(var(--wall-ink-soft-rgb) / 30%);
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  cursor: default;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease;
}

.wall-calendar__day.is-empty {
  visibility: hidden;
}

.wall-calendar__day.is-marked {
  color: var(--wall-ink-strong);
  cursor: pointer;
}

.wall-calendar__day.is-marked:hover {
  background: rgb(var(--wall-ink-soft-rgb) / 8%);
  transform: translateY(-1px);
}

.wall-calendar__day.is-marked:focus-visible {
  outline: 2px solid var(--wall-focus);
  outline-offset: 1px;
}

.wall-calendar__day.is-today .wall-calendar__day-number {
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.wall-calendar__day.is-selected {
  color: var(--wall-ink-strong);
  background: var(--wall-cal-today-bg);
  box-shadow: 0 3px 7px -4px rgb(0 0 0 / 55%);
}

.wall-calendar__day.is-selected:hover {
  background: var(--wall-cal-today-bg);
}

.wall-calendar__dot {
  position: absolute;
  bottom: 0.18rem;
  left: 50%;
  width: 0.2rem;
  height: 0.2rem;
  border-radius: 50%;
  background: rgb(var(--wall-accent-rgb));
  opacity: 0.65;
  transform: translateX(-50%);
}

.wall-calendar__day.is-selected .wall-calendar__dot {
  background: var(--wall-cal-dot);
  opacity: 0.8;
}

.wall-calendar__foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.32rem;
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px dashed rgb(var(--wall-line-rgb) / 20%);
  font-size: 0.56rem;
  letter-spacing: 0.04em;
  color: rgb(var(--wall-ink-soft-rgb) / 46%);
}

.wall-calendar__legend-dot {
  width: 0.22rem;
  height: 0.22rem;
  border-radius: 50%;
  background: rgb(var(--wall-accent-rgb));
  opacity: 0.65;
}
</style>
