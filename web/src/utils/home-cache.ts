// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { localStg } from '@/utils/storage'

export const HOME_CACHE_TTL = 12 * 60 * 60 * 1000
export const HOME_CONNECT_LIST_CACHE_TTL = 24 * 60 * 60 * 1000
export const HOME_CONNECT_STATUS_CACHE_TTL = 6 * 60 * 60 * 1000
export const HOME_HUB_FEED_CACHE_TTL = 60 * 60 * 1000
export const HOME_CACHE_VERSION = 1

export const HOME_ECHO_CACHE_PREFIX = 'home:echo-query-cache:v1:'
export const HOME_COMMENTS_CACHE_KEY = 'home:public-comments-cache:v1'
export const HOME_HEATMAP_CACHE_KEY = 'home:heatmap-cache:v1'
export const HOME_ACTIVITY_CACHE_KEY = 'home:activity-heatmap-cache:v1'
export const HOME_RECENT_CACHE_KEY = 'home:recent-summary-cache:v1'
export const HOME_CONNECT_LIST_CACHE_KEY = 'home:connect-list-cache:v1'
export const HOME_CONNECT_INFO_CACHE_KEY = 'home:connect-info-cache:v1'
export const HOME_HUB_FEED_CACHE_KEY = 'home:hub-feed-cache:v1'

const HOME_DERIVED_CACHE_KEYS = [
  HOME_COMMENTS_CACHE_KEY,
  HOME_HEATMAP_CACHE_KEY,
  HOME_ACTIVITY_CACHE_KEY,
  HOME_RECENT_CACHE_KEY,
  HOME_CONNECT_LIST_CACHE_KEY,
  HOME_CONNECT_INFO_CACHE_KEY,
  HOME_HUB_FEED_CACHE_KEY,
]

export type HomeCacheEnvelope<T> = {
  version: typeof HOME_CACHE_VERSION
  timestamp: number
  ttl: number
  data: T
}

export type HomeCacheReadResult<T> = {
  data: T
  fresh: boolean
  timestamp: number
}

const isBrowserStorageAvailable = () => typeof localStorage !== 'undefined'

export const isHomeCacheFresh = (timestamp: number, ttl = HOME_CACHE_TTL) =>
  timestamp > 0 && Date.now() - timestamp < ttl

export const writeHomeCache = <T>(key: string, data: T, ttl = HOME_CACHE_TTL) => {
  if (!isBrowserStorageAvailable()) return
  localStg.setItem<HomeCacheEnvelope<T>>(key, {
    version: HOME_CACHE_VERSION,
    timestamp: Date.now(),
    ttl,
    data,
  })
}

export const readHomeCache = <T>(
  key: string,
  fallbackTtl = HOME_CACHE_TTL,
): HomeCacheReadResult<T> | null => {
  if (!isBrowserStorageAvailable()) return null
  const cached = localStg.getItem<Record<string, unknown>>(key)
  if (!cached || typeof cached.timestamp !== 'number') return null
  const ttl = typeof cached.ttl === 'number' ? cached.ttl : fallbackTtl
  const isEnvelope = cached.version === HOME_CACHE_VERSION && typeof cached.ttl === 'number'
  const data = isEnvelope && 'data' in cached
    ? cached.data
    : Object.fromEntries(
        Object.entries(cached).filter(([field]) => !['timestamp', 'ttl', 'version'].includes(field)),
      )

  return {
    data: data as T,
    fresh: isHomeCacheFresh(cached.timestamp, ttl),
    timestamp: cached.timestamp,
  }
}

export const refreshHomeCacheInBackground = async <T>(
  key: string,
  ttl: number,
  loader: () => Promise<T | null | undefined>,
) => {
  try {
    const data = await loader()
    if (data === null || data === undefined) return
    writeHomeCache(key, data, ttl)
  } catch {}
}

export const invalidateEchoQueryCache = () => {
  if (!isBrowserStorageAvailable()) return
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(HOME_ECHO_CACHE_PREFIX))
      .forEach((key) => localStg.removeItem(key))
  } catch {}
}

export const invalidateHomeCommentsCache = () => {
  localStg.removeItem(HOME_COMMENTS_CACHE_KEY)
}

export const invalidateHomeDerivedCaches = () => {
  HOME_DERIVED_CACHE_KEYS.forEach((key) => localStg.removeItem(key))
}

export const invalidateHomeCaches = () => {
  invalidateEchoQueryCache()
  invalidateHomeDerivedCaches()
}
