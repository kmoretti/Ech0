// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { describe, expect, it } from 'vitest'
import { nextTick, ref, watch } from 'vue'

describe('home scroll restore watcher', () => {
  it('can stop itself when an immediate watcher starts ready', async () => {
    const ready = ref(true)
    let stopped = false
    let stopScrollRestoreWatch: (() => void) | null = null

    stopScrollRestoreWatch = watch(
      ready,
      (isReady) => {
        if (!isReady) return
        stopScrollRestoreWatch?.()
        stopped = true
      },
      { immediate: true, flush: 'post' },
    )

    await nextTick()

    expect(stopped).toBe(true)
  })
})
