// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { nextTick, ref } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TheEchos from '@/views/home/modules/TheEchos.vue'

const agentSetting = ref({ enable: false })
const systemSetting = ref({
  server_name: 'Ech0',
  server_logo: '/favicon.ico',
  site_title: '',
  footer_content: '',
  footer_link: '',
})

const echoStore = {
  currentPage: 1,
  totalPages: 1,
  echoList: [] as App.Api.Ech0.Echo[],
  isLoading: false,
  total: 1,
  isFilteringMode: false,
  pageSize: 50,
  fetchCurrentPage: vi.fn().mockResolvedValue(undefined),
  loadNextPage: vi.fn().mockResolvedValue(undefined),
  refreshEchos: vi.fn().mockResolvedValue(undefined),
}

const hubStore = {
  echoList: ref([] as App.Api.Hub.Echo[]),
  isLoading: ref(false),
  isPreparing: ref(false),
  hasMore: ref(false),
  hasTriedInitialLoad: ref(false),
  loadEchoListPage: vi.fn().mockResolvedValue(undefined),
  prepareHubFeed: vi.fn().mockResolvedValue(undefined),
}

vi.mock('pinia', async (importOriginal) => {
  const actual = await importOriginal<typeof import('pinia')>()
  return {
    ...actual,
    storeToRefs: <T>(store: T) => store,
  }
})

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/stores', () => ({
  useEchoStore: () => echoStore,
  useHubStore: () => hubStore,
  useSettingStore: () => ({ AgentSetting: agentSetting, SystemSetting: systemSetting }),
  useThemeStore: () => ({ mode: 'light', toggleTheme: vi.fn() }),
  useUserStore: () => ({ isLogin: false, logout: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('@/service/api', () => ({
  fetchGetPublicComments: vi.fn().mockResolvedValue({ code: 1, data: [] }),
}))

vi.mock('@/service/request/shared', () => ({
  resolveAvatarUrl: (url: string) => url,
}))

const mountEchos = () => shallowMount(TheEchos)

describe('TheEchos Recent card', () => {
  beforeEach(() => {
    agentSetting.value = { enable: false }
    echoStore.currentPage = 1
    echoStore.echoList = []
    vi.clearAllMocks()
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
  })

  it('waits for delayed Agent settings before mounting the Recent card', async () => {
    const wrapper = mountEchos()
    await flushPromises()
    await nextTick()

    expect(wrapper.find('.masonry-cell--ai-summary').exists()).toBe(false)

    agentSetting.value = { enable: true }
    await nextTick()

    expect(wrapper.find('.masonry-cell--ai-summary').exists()).toBe(true)
  })
})
