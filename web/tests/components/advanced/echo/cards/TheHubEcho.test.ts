// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { defineComponent } from 'vue'
import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import TheHubEcho from '@/components/advanced/echo/cards/TheHubEcho.vue'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
    }),
  }
})

const TheMdPreviewStub = defineComponent({
  name: 'TheMdPreview',
  props: {
    content: { type: String, required: true },
  },
  template: '<div data-test="markdown-preview">{{ content }}</div>',
})

function createEcho(content: string): App.Api.Hub.Echo {
  return {
    id: 'echo-1',
    content,
    username: 'echo-user',
    private: false,
    user_id: 'user-1',
    fav_count: 0,
    created_at: 0,
    createdTs: 0,
    virtual_key: 'server-1:echo-1',
    server_name: 'Example Echo',
    server_url: 'https://example.test',
    logo: 'https://example.test/logo.png',
  }
}

function mountCard(content: string) {
  return shallowMount(TheHubEcho, {
    props: { echo: createEcho(content) },
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

describe('TheHubEcho', () => {
  it('omits a Markdown image that crosses the preview boundary', () => {
    const beforeImage = 'a'.repeat(190)
    const image = `![preview](https://cdn.example.test/${'x'.repeat(64)}.jpg)`
    const wrapper = mountCard(`${beforeImage}${image} after the image`)

    expect(wrapper.findComponent(TheMdPreviewStub).props('content')).toBe(`${beforeImage}...`)

    const placeholder = wrapper.get('.hub-echo-more--image-placeholder')
    expect(placeholder.text()).toContain('hubEcho.imagePreviewTruncated')
    expect(placeholder.attributes('href')).toBe('https://example.test/echo/echo-1')
    expect(placeholder.attributes('target')).toBe('_blank')
    expect(placeholder.attributes('rel')).toBe('noopener noreferrer')
  })

  it('keeps a complete Markdown image ending at the preview boundary', () => {
    const image = '![preview](https://cdn.example.test/image.jpg)'
    const content = `${'a'.repeat(200 - Array.from(image).length)}${image} after the image`
    const wrapper = mountCard(content)

    expect(wrapper.findComponent(TheMdPreviewStub).props('content')).toBe(
      `${Array.from(content).slice(0, 200).join('')}...`,
    )
    expect(wrapper.find('.hub-echo-more--image-placeholder').exists()).toBe(false)
    expect(wrapper.get('.hub-echo-more').text()).toContain('echoCard.openDetail')
  })

  it('keeps the existing preview for long non-image content', () => {
    const content = 'a'.repeat(240)
    const wrapper = mountCard(content)

    expect(wrapper.findComponent(TheMdPreviewStub).props('content')).toBe(`${'a'.repeat(200)}...`)
    expect(wrapper.find('.hub-echo-more--image-placeholder').exists()).toBe(false)
    expect(wrapper.get('.hub-echo-more').text()).toContain('echoCard.openDetail')
  })
})
