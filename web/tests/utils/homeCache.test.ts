// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { describe, expect, it, vi } from 'vitest'
import {
  HOME_CACHE_TTL,
  HOME_CONNECT_STATUS_CACHE_TTL,
  readHomeCache,
  refreshHomeCacheInBackground,
  writeHomeCache,
} from '@/utils/home-cache'

describe('home-cache', () => {
  it('returns expired cache as stale instead of dropping it', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    writeHomeCache('test:stale', { value: 1 }, HOME_CACHE_TTL)

    vi.setSystemTime(new Date('2026-01-02T01:00:01Z'))
    const cached = readHomeCache<{ value: number }>('test:stale')

    expect(cached?.data).toEqual({ value: 1 })
    expect(cached?.fresh).toBe(false)
  })

  it('refreshes stale cache in background without mutating caller state', async () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    writeHomeCache('test:background', { value: 'old' }, HOME_CONNECT_STATUS_CACHE_TTL)

    vi.setSystemTime(new Date('2026-01-02T13:00:00Z'))
    const displayed = readHomeCache<{ value: string }>('test:background')?.data
    await refreshHomeCacheInBackground('test:background', HOME_CONNECT_STATUS_CACHE_TTL, async () => ({
      value: 'new',
    }))

    expect(displayed).toEqual({ value: 'old' })
    expect(readHomeCache<{ value: string }>('test:background')?.data).toEqual({ value: 'new' })
  })

  it('keeps legacy data-field cache payloads wrapped instead of treating them as envelopes', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    localStorage.setItem(
      'test:legacy-data-field',
      JSON.stringify({
        timestamp: Date.now(),
        data: [{ count: 1 }],
      }),
    )

    const cached = readHomeCache<{ data: { count: number }[] }>('test:legacy-data-field')

    expect(cached?.data).toEqual({ data: [{ count: 1 }] })
    expect(cached?.fresh).toBe(true)
  })
})
