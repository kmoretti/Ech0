// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { fetchGetConnectList, fetchGetAllConnectInfo } from '@/service/api'
import {
  HOME_CONNECT_INFO_CACHE_KEY,
  HOME_CONNECT_LIST_CACHE_TTL,
  HOME_CONNECT_LIST_CACHE_KEY,
  HOME_CONNECT_STATUS_CACHE_TTL,
  isHomeCacheFresh,
  readHomeCache,
  refreshHomeCacheInBackground,
  writeHomeCache,
} from '@/utils/home-cache'

export const useConnectStore = defineStore('connectStore', () => {
  const connects = ref<App.Api.Connect.Connected[]>([])
  const connectsInfo = ref<App.Api.Connect.Connect[]>([])
  const loading = ref<boolean>(true)
  const connectsFetchedAt = ref<number>(0)
  const connectsInfoFetchedAt = ref<number>(0)
  const connectsInFlight = ref<Promise<void> | null>(null)
  const connectsInfoInFlight = ref<Promise<void> | null>(null)

  const normalizeCachedArray = <T>(cachedData: T[] | { data?: T[] } | null | undefined) => {
    if (Array.isArray(cachedData)) return cachedData
    if (Array.isArray(cachedData?.data)) return cachedData.data
    return null
  }

  /**
   * Actions
   */
  const fetchConnectListPayload = async () => {
    const res = await fetchGetConnectList()
    if (res.code !== 1) return null
    return res.data
  }

  const fetchConnectInfoPayload = async () => {
    const res = await fetchGetAllConnectInfo()
    if (res.code !== 1) return null
    return res.data
  }

  async function getConnect(options?: { force?: boolean }) {
    const force = Boolean(options?.force)
    if (!force && isHomeCacheFresh(connectsFetchedAt.value, HOME_CONNECT_LIST_CACHE_TTL)) return
    const cached = force
      ? null
      : readHomeCache<App.Api.Connect.Connected[] | { data?: App.Api.Connect.Connected[] }>(
          HOME_CONNECT_LIST_CACHE_KEY,
          HOME_CONNECT_LIST_CACHE_TTL,
        )
    const cachedConnects = normalizeCachedArray(cached?.data)
    if (cached && cachedConnects) {
      connects.value = cachedConnects
      connectsFetchedAt.value = cached.timestamp
      if (!cached.fresh) {
        void refreshHomeCacheInBackground(
          HOME_CONNECT_LIST_CACHE_KEY,
          HOME_CONNECT_LIST_CACHE_TTL,
          fetchConnectListPayload,
        )
      }
      return
    }
    if (connectsInFlight.value) return connectsInFlight.value

    connectsInFlight.value = fetchConnectListPayload()
      .then((data) => {
        if (data) {
          connects.value = data
          connectsFetchedAt.value = Date.now()
          writeHomeCache(HOME_CONNECT_LIST_CACHE_KEY, data, HOME_CONNECT_LIST_CACHE_TTL)
        }
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        connectsInFlight.value = null
      })

    return connectsInFlight.value
  }

  const getConnectInfo = async (options?: { force?: boolean }) => {
    const force = Boolean(options?.force)
    if (!force && isHomeCacheFresh(connectsInfoFetchedAt.value, HOME_CONNECT_STATUS_CACHE_TTL)) {
      loading.value = false
      return
    }
    const cached = force
      ? null
      : readHomeCache<App.Api.Connect.Connect[] | { data?: App.Api.Connect.Connect[] }>(
          HOME_CONNECT_INFO_CACHE_KEY,
          HOME_CONNECT_STATUS_CACHE_TTL,
        )
    const cachedConnectsInfo = normalizeCachedArray(cached?.data)
    if (cached && cachedConnectsInfo) {
      connectsInfo.value = cachedConnectsInfo
      connectsInfoFetchedAt.value = cached.timestamp
      loading.value = false
      if (!cached.fresh) {
        void refreshHomeCacheInBackground(
          HOME_CONNECT_INFO_CACHE_KEY,
          HOME_CONNECT_STATUS_CACHE_TTL,
          fetchConnectInfoPayload,
        )
      }
      return
    }
    if (connectsInfoInFlight.value) return connectsInfoInFlight.value

    loading.value = true
    connectsInfoInFlight.value = fetchConnectInfoPayload()
      .then((data) => {
        if (data) {
          connectsInfo.value = data
          connectsInfoFetchedAt.value = Date.now()
          writeHomeCache(HOME_CONNECT_INFO_CACHE_KEY, data, HOME_CONNECT_STATUS_CACHE_TTL)
        }
      })
      .catch((err) => {
        console.error(err)
      })
      .finally(() => {
        loading.value = false
        connectsInfoInFlight.value = null
      })

    return connectsInfoInFlight.value
  }

  return {
    connects,
    connectsInfo,
    loading,
    getConnect,
    getConnectInfo,
  }
})
