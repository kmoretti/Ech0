// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TheWallNote from '@/components/advanced/wall/TheWallNote.vue'
import TheEchoDetail from '@/components/advanced/echo/cards/TheEchoDetail.vue'

const mocks = vi.hoisted(() => {
  return {
    push: vi.fn(async () => {}),
    currentQuery: {} as Record<string, string>,
    openConfirm: vi.fn(),
    fetchGetEchoById: vi.fn(),
    fetchDeleteEcho: vi.fn(),
    toastWarning: vi.fn(),
    toastSuccess: vi.fn(),
  }
})

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRouter: () => ({
      push: mocks.push,
      currentRoute: { value: { query: mocks.currentQuery } },
    }),
  }
})

vi.mock('@/service/api', () => ({
  fetchGetEchoById: mocks.fetchGetEchoById,
  fetchDeleteEcho: mocks.fetchDeleteEcho,
}))

vi.mock('@/service/request/shared', () => ({
  resolveAvatarUrl: (value?: string) => value ?? '',
  isStaticMode: () => false,
}))

vi.mock('@/utils/toast', () => ({
  theToast: {
    warning: mocks.toastWarning,
    success: mocks.toastSuccess,
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/composables/useBaseDialog', () => ({
  useBaseDialog: () => ({ openConfirm: mocks.openConfirm }),
}))

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  missingWarn: false,
  fallbackWarn: false,
  messages: {
    en: {
      wall: { viewDetail: 'Detail', openNote: 'Open note' },
      echoCard: {
        moreActions: 'More actions',
        update: 'Edit',
        delete: 'Delete',
        deleteConfirmTitle: 'Delete this echo?',
        deleteConfirmDesc: 'This cannot be undone',
        deleteSuccess: 'Deleted',
        exitUpdateModeFirst: 'Exit update mode first',
        privateStatus: 'Private',
      },
      commonNav: { back: 'Back' },
      starJournal: { words: '{count} words' },
    },
  },
})

const wrappers: VueWrapper[] = []

const mountNote = () => {
  const wrapper = mount(TheWallNote, {
    props: {
      echo: { id: 'e1', content: 'hello wall', tags: [], private: false, created_at: 1700000000 },
      paper: 'plain',
      fastener: 'tape',
      size: 'md',
      width: 120,
      height: 0,
      rotation: 0,
      zIndex: 1,
      interactive: true,
    },
    global: {
      plugins: [i18n],
      stubs: { teleport: true, TheEchoReactions: true, TheMediaPlayer: true },
    },
  })
  wrappers.push(wrapper)
  return wrapper
}

// TheWallNote keeps the open-menu id in module scope; unmounting resets it
// so each test starts with a closed menu.
afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
})

const loginAsOwner = async () => {
  const { useUserStore } = await import('@/stores')
  const userStore = useUserStore()
  userStore.user = { id: 'u1', username: 'kemiao' } as never
  return userStore
}

describe('TheWallNote owner menu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.currentQuery = {}
    vi.clearAllMocks()
  })

  it('hides the menu button for guests', () => {
    const wrapper = mountNote()
    expect(wrapper.find('.wall-note__menu-btn').exists()).toBe(false)
  })

  it('shows the menu button for logged-in owners and opens it', async () => {
    await loginAsOwner()

    const wrapper = mountNote()
    expect(wrapper.find('.wall-note__menu-btn').exists()).toBe(true)

    await wrapper.find('.wall-note__menu-btn').trigger('click')
    const rows = wrapper.findAll('.menu-row')
    expect(rows.length).toBe(2)
    expect(rows[0]!.text()).toContain('Edit')
    expect(rows[1]!.text()).toContain('Delete')
  })

  it('enters update mode and jumps to the publish tab on edit', async () => {
    await loginAsOwner()
    const { useEditorStore, useEchoStore } = await import('@/stores')
    const editorStore = useEditorStore()
    const echoStore = useEchoStore()

    mocks.fetchGetEchoById.mockResolvedValue({ code: 1, data: { id: 'e1', content: 'full' } })

    const wrapper = mountNote()
    await wrapper.find('.wall-note__menu-btn').trigger('click')
    await wrapper.findAll('.menu-row')[0]!.trigger('click')
    await flushPromises()

    expect(editorStore.isUpdateMode).toBe(true)
    expect(echoStore.echoToUpdate).toEqual({ id: 'e1', content: 'full' })
    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'home', query: { tab: 'publish' } }),
    )
  })

  it('warns instead of reloading when already in update mode', async () => {
    await loginAsOwner()
    const { useEditorStore } = await import('@/stores')
    const editorStore = useEditorStore()
    editorStore.isUpdateMode = true

    const wrapper = mountNote()
    await wrapper.find('.wall-note__menu-btn').trigger('click')
    await wrapper.findAll('.menu-row')[0]!.trigger('click')
    await flushPromises()

    expect(mocks.fetchGetEchoById).not.toHaveBeenCalled()
    expect(mocks.toastWarning).toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({ query: { tab: 'publish' } }),
    )
  })

  it('opens the delete confirm dialog', async () => {
    await loginAsOwner()

    const wrapper = mountNote()
    await wrapper.find('.wall-note__menu-btn').trigger('click')
    await wrapper.findAll('.menu-row')[1]!.trigger('click')

    expect(mocks.openConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('TheEchoDetail edit entry', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const mountDetail = () =>
    mount(TheEchoDetail, {
      props: {
        echo: { id: 'e1', content: 'detail', username: 'kemiao', tags: [] },
      },
      global: {
        plugins: [i18n],
        stubs: {
          TheEchoMeta: true,
          TheMdPreview: true,
          TheMediaPlayer: true,
          TheExtensionRenderer: true,
        },
      },
    })

  it('hides the edit button for guests', () => {
    const wrapper = mountDetail()
    expect(wrapper.find('.echo-detail-edit').exists()).toBe(false)
  })

  it('shows the edit button for logged-in owners and enters update mode', async () => {
    await loginAsOwner()
    const { useEditorStore, useEchoStore } = await import('@/stores')
    const editorStore = useEditorStore()
    const echoStore = useEchoStore()

    mocks.fetchGetEchoById.mockResolvedValue({ code: 1, data: { id: 'e1', content: 'full' } })

    const wrapper = mountDetail()
    expect(wrapper.find('.echo-detail-edit').exists()).toBe(true)

    await wrapper.find('.echo-detail-edit').trigger('click')
    await flushPromises()
    expect(editorStore.isUpdateMode).toBe(true)
    expect(echoStore.echoToUpdate).toEqual({ id: 'e1', content: 'full' })
    expect(mocks.push).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'home', query: { tab: 'publish' } }),
    )
  })
})
