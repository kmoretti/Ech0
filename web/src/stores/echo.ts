// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { fetchQueryEchos, fetchGetTags, fetchGetEchoById, fetchCreateTag } from '@/service/api'
import {
  HOME_CACHE_TTL,
  HOME_ECHO_CACHE_PREFIX,
  invalidateEchoQueryCache,
  invalidateHomeCaches,
  readHomeCache,
  refreshHomeCacheInBackground,
  writeHomeCache,
} from '@/utils/home-cache'

type EchoCachePayload = {
  total: number
  items: App.Api.Ech0.Echo[]
}

const isEchoCachePayload = (value: unknown): value is EchoCachePayload => {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<EchoCachePayload>
  return typeof payload.total === 'number' && Array.isArray(payload.items)
}

export const useEchoStore = defineStore('echoStore', () => {
  const normalizeEchoId = (echo: App.Api.Ech0.Echo): string => String(echo?.id ?? '').trim()

  // ─────────────────────────────────────────────
  //  统一查询状态（普通时间线与标签过滤共享同一套状态）
  // ─────────────────────────────────────────────

  const echoList = ref<App.Api.Ech0.Echo[]>([]) // 当前页展示的 Echo 列表
  const echoIndexMap = ref(new Map<string, number>()) // id → echoList 下标，用于快速定位
  const isLoading = ref<boolean>(false)
  const total = ref<number>(0) // 当前查询条件下的总条数
  const pageSize = ref<number>(50) // 首页瀑布流默认批量，避免一次渲染全部数据
  const currentPage = ref<number>(1) // 当前页码（从 1 开始）
  const searchValue = ref<string>('')
  const searchingMode = computed(() => searchValue.value.length > 0)
  const totalPages = computed(() =>
    total.value <= 0 ? 1 : Math.max(1, Math.ceil(total.value / pageSize.value)),
  )
  const echoToUpdate = ref<App.Api.Ech0.EchoToUpdate | null>(null)

  const tagList = ref<App.Api.Ech0.Tag[]>([])
  const tagOptions = computed<string[]>(() => tagList.value.map((tag) => tag.name))

  const isFilteringMode = ref<boolean>(false)
  const filteredTag = ref<App.Api.Ech0.Tag | null>(null)

  const dateFrom = ref<number | null>(null)
  const dateTo = ref<number | null>(null)
  const isDateRangeActive = computed(() => dateFrom.value !== null || dateTo.value !== null)

  const selectedTagIds = ref<string[]>([])
  const isTagSelectionActive = computed(() => selectedTagIds.value.length > 0)

  const visibilityFilter = ref<App.Api.Ech0.EchoVisibilityFilter>('all')
  const isVisibilityFilterActive = computed(() => visibilityFilter.value !== 'all')

  watch(searchingMode, (newValue, oldValue) => {
    if (newValue === false && oldValue === true) {
      refreshEchos()
    }
  })

  function buildQueryParams(): App.Api.Ech0.EchoQueryParams {
    const params: App.Api.Ech0.EchoQueryParams = {
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchValue.value || undefined,
    }
    const tagIds = new Set<string>()
    if (isFilteringMode.value && filteredTag.value) {
      tagIds.add(filteredTag.value.id)
    }
    selectedTagIds.value.forEach((id) => tagIds.add(id))
    if (tagIds.size > 0) {
      params.tagIds = Array.from(tagIds)
    }
    if (dateFrom.value !== null) {
      params.dateFrom = dateFrom.value
    }
    if (dateTo.value !== null) {
      params.dateTo = dateTo.value
    }
    if (visibilityFilter.value !== 'all') {
      params.private = visibilityFilter.value === 'private'
    }
    return params
  }

  const normalizeItems = (items: App.Api.Ech0.Echo[] = []) =>
    items.map((item) => ({
      ...item,
      id: normalizeEchoId(item),
    }))

  const rebuildIndexMap = (items: App.Api.Ech0.Echo[]) => {
    const nextIndex = new Map<string, number>()
    items.forEach((item, idx) => {
      if (item.id) nextIndex.set(item.id, idx)
    })
    echoIndexMap.value = nextIndex
  }

  const cacheKeyForParams = (params: App.Api.Ech0.EchoQueryParams) =>
    `${HOME_ECHO_CACHE_PREFIX}${JSON.stringify(params)}`

  const readQueryCache = (params: App.Api.Ech0.EchoQueryParams) => {
    return readHomeCache<EchoCachePayload>(cacheKeyForParams(params))
  }

  const writeQueryCache = (
    params: App.Api.Ech0.EchoQueryParams,
    payload: EchoCachePayload,
  ) => {
    writeHomeCache(cacheKeyForParams(params), payload, HOME_CACHE_TTL)
  }

  const refreshQueryCacheInBackground = (params: App.Api.Ech0.EchoQueryParams) =>
    refreshHomeCacheInBackground(cacheKeyForParams(params), HOME_CACHE_TTL, async () => {
      const res = await fetchQueryEchos(params)
      if (res.code !== 1) return null
      return {
        total: res.data.total,
        items: normalizeItems(res.data.items ?? []),
      }
    })

  const resetDateRange = () => {
    dateFrom.value = null
    dateTo.value = null
  }

  const resetSelectedTags = () => {
    selectedTagIds.value = []
  }

  const resetVisibilityFilter = () => {
    visibilityFilter.value = 'all'
  }

  const removeSelectedTag = (tagId: string) => {
    selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId)
    if (filteredTag.value?.id === tagId && isFilteringMode.value) {
      isFilteringMode.value = false
      filteredTag.value = null
    }
  }

  let pendingFetch: Promise<void> | null = null
  async function fetchCurrentPage(options: { force?: boolean } = {}) {
    if (pendingFetch) return pendingFetch

    const params = buildQueryParams()
    const cached = options.force ? null : readQueryCache(params)
    if (cached && isEchoCachePayload(cached.data)) {
      total.value = cached.data.total
      echoList.value = normalizeItems(cached.data.items)
      rebuildIndexMap(echoList.value)
      isLoading.value = false
      if (!cached.fresh) void refreshQueryCacheInBackground(params)
      return
    }

    isLoading.value = true
    pendingFetch = fetchQueryEchos(params)
      .then((res) => {
        if (res.code === 1) {
          total.value = res.data.total
          const items = normalizeItems(res.data.items ?? [])
          echoList.value = items
          rebuildIndexMap(items)
          writeQueryCache(params, { total: res.data.total, items })
        }
      })
      .catch((error) => {
        console.warn('[Echo] failed to fetch current page', error)
      })
      .finally(() => {
        isLoading.value = false
        pendingFetch = null
      })

    return pendingFetch
  }

  async function loadNextPage() {
    if (pendingFetch || currentPage.value >= totalPages.value) return

    const previousPage = currentPage.value
    currentPage.value += 1
    const params = buildQueryParams()
    const cached = readQueryCache(params)
    if (cached && isEchoCachePayload(cached.data)) {
      total.value = cached.data.total
      const knownIds = new Set(echoList.value.map((item) => normalizeEchoId(item)))
      const appended = normalizeItems(cached.data.items).filter(
        (item) => item.id && !knownIds.has(item.id),
      )
      echoList.value = [...echoList.value, ...appended]
      rebuildIndexMap(echoList.value)
      if (!cached.fresh) void refreshQueryCacheInBackground(params)
      return
    }

    isLoading.value = true
    pendingFetch = fetchQueryEchos(params)
      .then((res) => {
        if (res.code !== 1) {
          currentPage.value = previousPage
          return
        }

        total.value = res.data.total
        const knownIds = new Set(echoList.value.map((item) => normalizeEchoId(item)))
        const pageItems = normalizeItems(res.data.items ?? [])
        const appended = pageItems.filter((item) => item.id && !knownIds.has(item.id))
        echoList.value = [...echoList.value, ...appended]
        rebuildIndexMap(echoList.value)
        writeQueryCache(params, { total: res.data.total, items: pageItems })
      })
      .catch((error) => {
        currentPage.value = previousPage
        throw error
      })
      .finally(() => {
        isLoading.value = false
        pendingFetch = null
      })

    return pendingFetch
  }

  async function goToPage(page: number) {
    const target = Math.max(1, Math.floor(page) || 1)
    if (target === currentPage.value && echoList.value.length > 0) return
    currentPage.value = target
    await fetchCurrentPage()
  }

  const refreshEchos = () => {
    currentPage.value = 1
    total.value = 0
    echoList.value = []
    echoIndexMap.value = new Map()
    return fetchCurrentPage({ force: true })
  }

  const clearEchos = () => {
    currentPage.value = 1
    total.value = 0
    echoList.value = []
    echoIndexMap.value = new Map()
  }

  const invalidateEchosCache = () => {
    invalidateHomeCaches()
  }

  /** 仅重置分页指针与列表，不触发加载（搜索场景由调用方控制加载时机）。 */
  const refreshForSearch = () => {
    currentPage.value = 1
    total.value = 0
    echoList.value = []
    echoIndexMap.value = new Map()
  }

  const updateEcho = (echo: App.Api.Ech0.Echo) => {
    const idx = echoIndexMap.value.get(echo.id)
    if (idx !== undefined) {
      echoList.value[idx] = echo
    }
  }

  const updateLikeCount = (echoId: string, delta: number = 1) => {
    const idx = echoIndexMap.value.get(echoId)
    if (idx !== undefined) {
      const targetEcho = echoList.value[idx]
      if (targetEcho) {
        targetEcho.fav_count = (targetEcho.fav_count || 0) + delta
        echoList.value[idx] = { ...targetEcho }
        invalidateEchoQueryCache()
      }
    }
  }

  const pendingEchoMap = new Map<string, Promise<App.Api.Ech0.Echo | null>>()

  const prefetchEcho = (echoId: string): Promise<App.Api.Ech0.Echo | null> => {
    const id = String(echoId ?? '').trim()
    if (!id) return Promise.resolve(null)

    const idx = echoIndexMap.value.get(id)
    if (idx !== undefined && echoList.value[idx]) {
      return Promise.resolve(echoList.value[idx]!)
    }

    const existing = pendingEchoMap.get(id)
    if (existing) return existing

    const promise: Promise<App.Api.Ech0.Echo | null> = fetchGetEchoById(id)
      .then((res) => {
        if (res.code === 1 && res.data) {
          return res.data
        }
        return null
      })
      .catch(() => null)
      .finally(() => {
        pendingEchoMap.delete(id)
      }) as Promise<App.Api.Ech0.Echo | null>

    pendingEchoMap.set(id, promise)
    return promise
  }

  const getTags = async () => {
    const res = await fetchGetTags()
    if (res.code === 1) {
      tagList.value.splice(0, tagList.value.length, ...res.data)
    }
  }

  const createTag = async (name: string) => {
    const res = await fetchCreateTag(name)
    if (res.code === 1) {
      invalidateEchosCache()
      await getTags()
      return res.data
    }
    return null
  }

  let tagsLoadPromise: Promise<void> | null = null
  const ensureTagsLoaded = (): Promise<void> => {
    if (tagList.value.length > 0) return Promise.resolve()
    if (tagsLoadPromise) return tagsLoadPromise
    tagsLoadPromise = getTags().finally(() => {
      tagsLoadPromise = null
    })
    return tagsLoadPromise
  }

  return {
    echoList,
    echoIndexMap,
    isLoading,
    total,
    pageSize,
    currentPage,
    totalPages,
    searchValue,
    searchingMode,
    echoToUpdate,
    tagList,
    tagOptions,

    isFilteringMode,
    filteredTag,

    dateFrom,
    dateTo,
    isDateRangeActive,

    selectedTagIds,
    isTagSelectionActive,

    visibilityFilter,
    isVisibilityFilterActive,

    fetchCurrentPage,
    loadNextPage,
    goToPage,
    refreshEchos,
    clearEchos,
    refreshForSearch,
    resetDateRange,
    resetSelectedTags,
    resetVisibilityFilter,
    removeSelectedTag,
    updateEcho,
    invalidateEchosCache,
    updateLikeCount,
    prefetchEcho,
    getTags,
    ensureTagsLoaded,
    createTag,
  }
})
