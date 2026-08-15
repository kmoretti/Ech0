// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConnectStore } from '@/stores/connect'
import {
  HOME_CONNECT_INFO_CACHE_KEY,
  HOME_CONNECT_LIST_CACHE_KEY,
  HOME_CONNECT_STATUS_CACHE_TTL,
  writeHomeCache,
} from '@/utils/home-cache'

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

  it('invalidates cached empty Connect data before a forced refresh', async () => {
    writeHomeCache(HOME_CONNECT_INFO_CACHE_KEY, [], HOME_CONNECT_STATUS_CACHE_TTL)
    writeHomeCache(HOME_CONNECT_LIST_CACHE_KEY, [], HOME_CONNECT_STATUS_CACHE_TTL)
    apiMocks.fetchGetAllConnectInfo.mockResolvedValue({
      code: 1,
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
    })

    const store = useConnectStore()
    await store.getConnectInfo()
    expect(store.connectsInfo).toEqual([])

    store.invalidateConnectCaches()
    await store.getConnectInfo({ force: true })

    expect(apiMocks.fetchGetAllConnectInfo).toHaveBeenCalledTimes(1)
    expect(store.connectsInfo[0]?.server_url).toBe('https://peer.example')
    expect(localStorage.getItem(HOME_CONNECT_LIST_CACHE_KEY)).toBeNull()
  })

  it('updates current state after revalidating expired Connect info cache', async () => {
    writeHomeCache(HOME_CONNECT_INFO_CACHE_KEY, [], HOME_CONNECT_STATUS_CACHE_TTL)
    vi.setSystemTime(new Date('2026-01-01T19:00:01Z'))
    apiMocks.fetchGetAllConnectInfo.mockResolvedValue({
      code: 1,
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
    })

    const store = useConnectStore()
    await store.getConnectInfo()
    await vi.waitFor(() => {
      expect(store.connectsInfo[0]?.server_url).toBe('https://peer.example')
    })
  })
})
