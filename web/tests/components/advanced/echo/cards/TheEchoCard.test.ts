// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { defineComponent } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TheEchoCard from '@/components/advanced/echo/cards/TheEchoCard.vue'

const { routerPush } = vi.hoisted(() => ({
  routerPush: vi.fn(),
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPush,
    currentRoute: { value: { query: {} } },
  }),
}))

vi.mock('@/stores', () => ({
  useUserStore: () => ({ isLogin: false }),
  useEchoStore: () => ({
    invalidateEchosCache: vi.fn(),
    updateLikeCount: vi.fn(),
    echoToUpdate: null,
  }),
  useEditorStore: () => ({ isUpdateMode: false }),
}))

vi.mock('@/service/api', () => ({
  fetchDeleteEcho: vi.fn(),
  fetchGetEchoById: vi.fn(),
}))

vi.mock('@/utils/toast', () => ({
  theToast: {
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('@/composables/useBaseDialog', () => ({
  useBaseDialog: () => ({ openConfirm: vi.fn() }),
}))

const TheMdPreviewStub = defineComponent({
  name: 'TheMdPreview',
  props: {
    content: { type: String, required: true },
  },
  template: '<div data-test="markdown-preview">{{ content }}</div>',
})

function createEcho(content: string, layout?: string): App.Api.Ech0.Echo {
  return {
    id: 'echo-1',
    content,
    username: 'echo-user',
    private: false,
    user_id: 'user-1',
    fav_count: 0,
    created_at: 0,
    layout,
  }
}

function mountCard(content: string, layout?: string, variant: 'timeline' | 'masonry' = 'masonry') {
  return shallowMount(TheEchoCard, {
    props: {
      echo: createEcho(content, layout),
      variant,
    },
    global: {
      directives: {
        tooltip: () => undefined,
      },
      stubs: {
        TheMdPreview: TheMdPreviewStub,
      },
    },
  })
}

function previewContent(wrapper: ReturnType<typeof mountCard>): string {
  return wrapper.findComponent(TheMdPreviewStub).props('content') as string
}

beforeEach(() => {
  routerPush.mockReset()
})

describe('TheEchoCard', () => {
  it('replaces a content-leading image that crosses the preview boundary with an inline placeholder', async () => {
    const beforeImage = `${'a'.repeat(198)}🙂`
    const image = `![preview](https://cdn.example.test/${'x'.repeat(64)}.jpg)`
    const wrapper = mountCard(`${beforeImage}${image} after the image`, 'grid')

    expect(previewContent(wrapper)).toBe(`${beforeImage}...`)
    expect(previewContent(wrapper)).not.toContain('![preview]')

    const placeholder = wrapper.get('.echo-card-image-placeholder')
    expect(placeholder.text()).toContain('echoCard.imagePreviewTruncated')
    await placeholder.trigger('click')

    expect(routerPush).toHaveBeenCalledWith({
      name: 'echo',
      params: { echoId: 'echo-1' },
    })
  })

  it('renders the inline placeholder after media for a media-leading card', () => {
    const beforeImage = 'a'.repeat(190)
    const image = `![preview](https://cdn.example.test/${'x'.repeat(64)}.jpg)`
    const wrapper = mountCard(`${beforeImage}${image}`)

    expect(previewContent(wrapper)).toBe(`${beforeImage}...`)
    expect(wrapper.get('div.mt-3').find('.echo-card-image-placeholder').exists()).toBe(true)
  })

  it('keeps complete Markdown images and long text intact', () => {
    const image = '![preview](https://cdn.example.test/image.jpg)'
    const completeImageContent = `${'a'.repeat(200 - Array.from(image).length)}${image} after the image`
    const completeImageCard = mountCard(completeImageContent)
    const longText = 'a'.repeat(240)
    const longTextCard = mountCard(longText)

    expect(previewContent(completeImageCard)).toBe(completeImageContent)
    expect(completeImageCard.find('.echo-card-image-placeholder').exists()).toBe(false)
    expect(previewContent(longTextCard)).toBe(longText)
    expect(longTextCard.find('.echo-card-image-placeholder').exists()).toBe(false)
  })

  it('keeps full Markdown in timeline cards', () => {
    const beforeImage = 'a'.repeat(190)
    const image = `![preview](https://cdn.example.test/${'x'.repeat(64)}.jpg)`
    const content = `${beforeImage}${image}`
    const wrapper = mountCard(content, undefined, 'timeline')

    expect(previewContent(wrapper)).toBe(content)
    expect(wrapper.find('.echo-card-image-placeholder').exists()).toBe(false)
  })
})
