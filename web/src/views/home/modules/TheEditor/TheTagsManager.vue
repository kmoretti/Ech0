<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="tag-manager-panel">
    <header class="tag-manager-panel__header">
      <h2>{{ t('editor.tagManagerTitle') }}</h2>
      <p>{{ t('editor.tagManagerHint') }}</p>
    </header>

    <form v-if="isLogin" class="tag-manager-panel__form" @submit.prevent="handleCreateTag">
      <div class="tag-manager-panel__input-wrap">
        <span>#</span>
        <input
          v-model="newTagName"
          type="text"
          maxlength="50"
          :placeholder="t('editor.createTagPlaceholder')"
        />
      </div>
      <button
        type="submit"
        :disabled="isCreating || newTagName.trim() === ''"
        class="tag-manager-panel__submit"
      >
        {{ t('editor.createTagButton') }}
      </button>
    </form>

    <div
      v-if="tagList.length === 0"
      class="tag-manager-panel__empty"
    >
      {{ t('editor.tagManagerEmpty') }}
    </div>
    <div v-else ref="listRef" class="tag-manager-panel__list">
      <Popover
        v-for="tag in tagList"
        :key="tag.id"
        class="relative overflow-visible"
        v-slot="{ close }"
      >
        <PopoverButton
          class="tag-manager-panel__tag"
          style="white-space: nowrap"
          @click="resolvePanelSide($event, tag.id)"
        >
          <div
            class="tag-manager-panel__tag-inner"
          >
            <div>#</div>
            {{ tag.name }}
          </div>
        </PopoverButton>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-1 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="translate-y-1 opacity-0"
        >
          <PopoverPanel :class="getPopoverPanelClass(tag.id)">
            <div class="overflow-hidden rounded-md shadow-sm ring-black/5">
              <div
                class="relative flex justify-around gap-2 bg-[var(--color-bg-surface)] p-1 text-[var(--color-text-secondary)]"
              >
                <button
                  @click="
                    () => {
                      handleFilterByTag(tag)
                      close()
                    }
                  "
                  v-tooltip="t('editor.filterByTag')"
                  class="flex items-center justify-center rounded-md p-1 transition duration-150 ease-in-out hover:text-[var(--color-text-primary)] focus:outline-none focus-visible:ring focus-visible:ring-[var(--input-focus-color-border-subtle)]"
                >
                  <Filter class="w-5 h-5" />
                </button>
                <div v-if="isLogin" class="w-px bg-[var(--color-bg-muted)]"></div>
                <button
                  v-if="isLogin"
                  @click="
                    () => {
                      handleDeleteTag(tag.id)
                      close()
                    }
                  "
                  v-tooltip="t('editor.deleteTag')"
                  class="flex items-center justify-center rounded-md p-1 transition duration-150 ease-in-out hover:text-[var(--color-danger)] focus:outline-none focus-visible:ring focus-visible:ring-[var(--input-focus-color-border-subtle)]"
                >
                  <Trashbin class="w-5 h-5" />
                </button>
              </div>
            </div>
          </PopoverPanel>
        </transition>
      </Popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useEchoStore, useUserStore } from '@/stores'
import { fetchDeleteTagById } from '@/service/api'
import { storeToRefs } from 'pinia'
import { useBaseDialog } from '@/composables/useBaseDialog'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue'
import Trashbin from '@/components/icons/trashbin.vue'
import Filter from '@/components/icons/filter.vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { theToast } from '@/utils/toast'

const echoStore = useEchoStore()
const userStore = useUserStore()
const { tagList } = storeToRefs(echoStore)
const { isLogin } = storeToRefs(userStore)
const { t } = useI18n()
const router = useRouter()

const newTagName = ref('')
const isCreating = ref(false)

const handleCreateTag = async () => {
  const name = newTagName.value.trim().replace(/^#+/, '').trim()
  if (!name) {
    theToast.warning(String(t('editor.createTagEmpty')))
    return
  }
  isCreating.value = true
  try {
    const tag = await echoStore.createTag(name)
    if (tag) {
      newTagName.value = ''
      theToast.success(String(t('editor.createTagSuccess')))
    }
  } finally {
    isCreating.value = false
  }
}

onMounted(() => {
  echoStore.ensureTagsLoaded()
})

const { openConfirm } = useBaseDialog()

const listRef = ref<HTMLElement | null>(null)
const panelSides = reactive<Record<string, 'left' | 'center' | 'right'>>({})

const resolvePanelSide = (event: MouseEvent, tagId: string) => {
  const button = event.currentTarget as HTMLElement | null
  const container = listRef.value
  if (!button || !container) {
    panelSides[tagId] = 'center'
    return
  }
  const buttonRect = button.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const halfPanel = 96 / 2
  const buttonCenter = buttonRect.left + buttonRect.width / 2
  if (buttonCenter - halfPanel < containerRect.left) {
    panelSides[tagId] = 'left'
  } else if (buttonCenter + halfPanel > containerRect.right) {
    panelSides[tagId] = 'right'
  } else {
    panelSides[tagId] = 'center'
  }
}

const getPopoverPanelClass = (tagId: string) => {
  const side = panelSides[tagId] ?? 'center'
  if (side === 'left') return 'absolute left-0 z-[60] mt-1'
  if (side === 'right') return 'absolute right-0 z-[60] mt-1'
  return 'absolute left-1/2 z-[60] mt-1 -translate-x-1/2 transform'
}

const handleFilterByTag = (tag: App.Api.Ech0.Tag) => {
  if (!tag) return

  echoStore.filteredTag = tag
  echoStore.isFilteringMode = true
  echoStore.refreshEchos()
  router.push({ name: 'home' })
}

const handleDeleteTag = (tagId: string) => {
  openConfirm({
    title: String(t('editor.deleteTagConfirmTitle')),
    description: String(t('editor.deleteTagConfirmDesc')),
    onConfirm: () => {
      fetchDeleteTagById(tagId).then((res) => {
        if (res.code === 1) {
          echoStore.invalidateEchosCache()
          echoStore.getTags()
        }
      })
    },
  })
}
</script>

<style scoped>
.tag-manager-panel {
  padding: 1rem;
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-bg-surface) 96%, transparent);
  box-shadow: 0 8px 24px rgb(0 0 0 / 4%);
}

.tag-manager-panel__header {
  margin-bottom: 1rem;
}

.tag-manager-panel__header h2 {
  margin: 0 0 0.25rem;
  color: var(--color-text-primary);
  font-family: var(--font-family-display);
  font-size: 1rem;
  font-weight: 700;
}

.tag-manager-panel__header p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.78rem;
}

.tag-manager-panel__form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag-manager-panel__input-wrap {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  align-items: center;
  gap: 0.35rem;
  padding: 0.42rem 0.55rem;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xs);
  background: color-mix(in srgb, var(--color-bg-surface) 92%, transparent);
  transition: border-color 160ms ease;
}

.tag-manager-panel__input-wrap:focus-within {
  border-color: var(--color-border-strong);
}

.tag-manager-panel__input-wrap span {
  color: var(--color-text-muted);
  user-select: none;
}

.tag-manager-panel__input-wrap input {
  min-width: 0;
  flex: 1 1 auto;
  color: var(--color-text-primary);
  background: transparent;
  border: 0;
  outline: 0;
  font-size: 0.875rem;
}

.tag-manager-panel__input-wrap input::placeholder {
  color: var(--color-text-muted);
}

.tag-manager-panel__submit {
  flex: 0 0 auto;
  padding: 0.42rem 0.75rem;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-xs);
  font-size: 0.85rem;
  font-weight: 600;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.tag-manager-panel__submit:hover:not(:disabled) {
  color: var(--color-accent);
  border-color: color-mix(in srgb, var(--color-accent) 28%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}

.tag-manager-panel__submit:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tag-manager-panel__empty {
  padding: 1.25rem 0;
  color: var(--color-text-muted);
  text-align: center;
  font-size: 0.875rem;
}

.tag-manager-panel__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tag-manager-panel__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0.25rem 0.55rem;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border-subtle);
  border-radius: 999px;
  outline: none;
  transition:
    color 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease;
}

.tag-manager-panel__tag:hover {
  color: var(--color-accent);
  border-color: color-mix(in srgb, var(--color-accent) 24%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-accent) 7%, transparent);
}

.tag-manager-panel__tag-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

@media (width < 640px) {
  .tag-manager-panel {
    padding: 0.85rem;
  }

  .tag-manager-panel__form {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
