// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { defineComponent, nextTick, ref } from 'vue'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TheRecentCard from '@/components/advanced/widget/TheRecentCard.vue'
import { HOME_RECENT_CACHE_KEY, readHomeCache, writeHomeCache } from '@/utils/home-cache'

const apiMocks = vi.hoisted(() => ({
  fetchGetRecent: vi.fn(),
}))

const agentSetting = ref({ enable: true })

vi.mock('@/service/api', () => apiMocks)
vi.mock('@/stores', () => ({
  useSettingStore: () => ({ AgentSetting: agentSetting }),
}))
vi.mock('pinia', () => ({
  storeToRefs: <T>(store: T) => store,
}))
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => (key === 'recentCard.mysteriousRecent' ? '作者最近很神秘~' : key),
  }),
}))

const TheMdPreviewStub = defineComponent({
  name: 'TheMdPreview',
  props: {
    content: { type: String, required: true },
  },
  template: '<div data-test="markdown-preview">{{ content }}</div>',
})

const mountCard = () =>
  shallowMount(TheRecentCard, {
    global: {
      stubs: {
        TheMdPreview: TheMdPreviewStub,
      },
    },
  })

const previewContent = (wrapper: ReturnType<typeof mountCard>) =>
  wrapper.findComponent(TheMdPreviewStub).props('content') as string

describe('TheRecentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    agentSetting.value = { enable: true }
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('replaces a cached fallback summary with the current API result', async () => {
    writeHomeCache(HOME_RECENT_CACHE_KEY, { recent: '作者最近很神秘~' })
    apiMocks.fetchGetRecent.mockResolvedValue({ code: 1, data: '新的近期总结' })

    const wrapper = mountCard()
    await flushPromises()
    await nextTick()

    expect(previewContent(wrapper)).toBe('新的近期总结')
    expect(readHomeCache<{ recent: string }>(HOME_RECENT_CACHE_KEY)?.data).toEqual({
      recent: '新的近期总结',
    })
  })

  it('keeps a usable cached summary when the API request fails', async () => {
    writeHomeCache(HOME_RECENT_CACHE_KEY, { recent: '已有的近期总结' })
    apiMocks.fetchGetRecent.mockRejectedValue(new Error('network unavailable'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const wrapper = mountCard()
    await flushPromises()
    await nextTick()

    expect(previewContent(wrapper)).toBe('已有的近期总结')
    expect(readHomeCache<{ recent: string }>(HOME_RECENT_CACHE_KEY)?.data).toEqual({
      recent: '已有的近期总结',
    })
    expect(consoleError).toHaveBeenCalled()
  })
})
