// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { describe, expect, it, vi } from 'vitest'
import { localStg } from '@/utils/storage'

describe('storage helpers', () => {
  it('swallows localStorage write failures', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded')
    })

    expect(() => localStg.setItem('cache-key', { value: 1 })).not.toThrow()
  })

  it('returns null when localStorage read fails', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(localStg.getItem('cache-key')).toBeNull()
  })
})
