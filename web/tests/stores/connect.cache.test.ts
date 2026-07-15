// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConnectStore } from '@/stores/connect'
import { HOME_CONNECT_INFO_CACHE_KEY } from '@/utils/home-cache'

const apiMocks = vi.hoisted(() => ({
  fetchGetConnectList: vi.fn(),
  fetchGetAllConnectInfo: vi.fn(),
}))

vi.mock('@/service/api', () => apiMocks)

describe('connectStore cache', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  })

  it('unwraps legacy connect info cache payloads before rendering', async () => {
    localStorage.setItem(
      HOME_CONNECT_INFO_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        data: [
          {
            server_name: 'Peer',
            server_url: 'https://peer.example',
            logo: 'https://peer.example/logo.png',
            total_echos: 10,
            today_echos: 1,
            sys_username: 'peer',
            version: '1.0.0',
          },
        ],
      }),
    )

    const store = useConnectStore()
    await store.getConnectInfo()

    expect(store.connectsInfo).toHaveLength(1)
    expect(store.connectsInfo[0]?.server_name).toBe('Peer')
    expect(apiMocks.fetchGetAllConnectInfo).not.toHaveBeenCalled()
  })
})
