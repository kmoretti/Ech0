// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { getEchoFiles } from '@/utils/echo'
import { timeValueToMs } from '@/utils/timeValue'

export type WallEcho = App.Api.Ech0.Echo
export type WallPaper = 'plain' | 'ruled' | 'grid' | 'kraft' | 'torn' | 'photo' | 'index'
export type WallFastener = 'pin' | 'tape' | 'clip' | 'staple'

export type WallNoteMeta = {
  paper: WallPaper
  fastener: WallFastener
  rotation: number
}

export const hashString = (value: string): number => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export const mulberry32 = (seed: number) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export const wallEchoTime = (echo: WallEcho): number => {
  const ms = timeValueToMs(echo.created_at)
  return Number.isFinite(ms) && ms > 0 ? ms : Date.now()
}

export const wallDayKey = (echo: WallEcho): string =>
  wallDayKeyFromDate(new Date(wallEchoTime(echo)))

export const wallDayKeyFromDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const wallMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const weekdayFormatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' })

export const wallDateStamp = (echo: WallEcho) => {
  const date = new Date(wallEchoTime(echo))
  const year = String(date.getFullYear()).slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return {
    stamp: `${year}年${month}月${day}日`,
    weekday: weekdayFormatter.format(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    date,
  }
}

export const formatWallDay = (dayKey: string): string => {
  const [year, month, day] = dayKey.split('-').map(Number)
  if (!year || !month || !day) return dayKey
  const date = new Date(year, month - 1, day)
  return `${String(year).slice(-2)}年${String(month).padStart(2, '0')}月${String(day).padStart(2, '0')}日 · ${weekdayFormatter.format(date)}`
}

export const hasWallImage = (echo: WallEcho): boolean =>
  getEchoFiles(echo).some((file) => file.category === 'image')

export const wallNoteMeta = (echo: WallEcho, featured = false): WallNoteMeta => {
  const random = mulberry32(hashString(`${echo.id}:wall`))
  const image = hasWallImage(echo)
  const pool: WallPaper[] = image
    ? ['photo', 'photo', 'plain', 'torn', 'index']
    : ['plain', 'ruled', 'grid', 'kraft', 'torn', 'index']
  const paper = pool[Math.floor(random() * pool.length)] ?? 'plain'
  const fasteners: WallFastener[] = ['pin', 'tape', 'clip', 'staple']
  const fastener = fasteners[Math.floor(random() * fasteners.length)] ?? 'pin'
  const rotation = (random() * 2 - 1) * (featured ? 1.4 : 3.4)
  return { paper, fastener, rotation }
}

export const wallBody = (content: string | null | undefined, limit = 480): string => {
  const text = String(content ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_~`]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit).trimEnd()}…`
}

