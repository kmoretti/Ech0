<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <article
    class="hub-echo-card relative w-full bg-[var(--color-bg-surface)] h-auto p-3 sm:p-3.5 shadow rounded-[8px]"
  >
    <div class="flex flex-row items-center justify-between gap-2 mt-1 mb-3">
      <div class="flex flex-row items-center gap-2 min-w-0">
        <div class="flex-none">
          <img
            :src="echo.logo"
            alt="logo"
            loading="lazy"
            decoding="async"
            class="w-6 h-6 sm:w-7 sm:h-7 rounded-full ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-sm)] object-cover"
          />
        </div>
        <div class="flex items-center gap-1 min-w-0">
          <h2
            class="text-[var(--color-text-primary)] font-bold overflow-hidden whitespace-nowrap truncate"
          >
            <a :href="echo.server_url" target="_blank">{{ echo.server_name }}</a>
          </h2>

          <div class="flex-none">
            <Verified class="text-sky-500 w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      <a
        :href="`${echo.server_url}/echo/${echo.id}`"
        target="_blank"
        rel="noopener noreferrer"
        v-tooltip="t('hubEcho.jumpToEcho')"
        class="flex-none opacity-70 hover:opacity-100 transition-opacity"
      >
        <img
          src="/favicon.ico"
          alt="Ech0"
          loading="lazy"
          decoding="async"
          class="w-5 h-5 sm:w-6 sm:h-6 object-contain"
        />
      </a>
    </div>

    <div class="hub-echo-body py-1.5" :class="{ 'hub-echo-body--clamped': isLongContent }">
      <template v-if="isContentLeadingEcho(props.echo)">
        <div class="mb-2.5">
          <TheMdPreview :content="previewContent" />
        </div>

        <TheMediaPlayer :echo="props.echo" :baseUrl="echo.server_url" :layout="props.echo.layout" />
      </template>

      <template v-else>
        <TheMediaPlayer :echo="props.echo" :baseUrl="echo.server_url" :layout="props.echo.layout" />

        <div class="mt-2.5">
          <TheMdPreview :content="previewContent" />
        </div>
      </template>

      <div v-if="props.echo.extension" class="my-2.5">
        <TheExtensionRenderer :echo="props.echo" />
      </div>
    </div>

    <a
      v-if="isLongContent"
      :href="`${echo.server_url}/echo/${echo.id}`"
      target="_blank"
      rel="noopener noreferrer"
      class="hub-echo-more"
    >
      {{ t('echoCard.openDetail') }}
    </a>

    <div class="mt-1 flex items-center justify-between gap-2">
      <div class="min-w-0 truncate whitespace-nowrap text-xs text-[var(--color-text-muted)]">
        {{ formatDate(props.echo.createdTs) }}
      </div>

      <div class="flex flex-none items-center gap-1" v-tooltip="t('hubEcho.like')">
        <button
          @click="handleLikeEcho()"
          :class="[
            'transform transition-transform duration-150',
            isLikeAnimating ? 'scale-160' : 'scale-100',
          ]"
        >
          <GrayLike class="w-4 h-4" />
        </button>

        <span class="text-xs text-[var(--color-text-muted)]">
          {{ fav_count > 99 ? '99+' : fav_count }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import Verified from '@/components/icons/verified.vue'
import GrayLike from '@/components/icons/graylike.vue'
import { TheMdPreview } from '@/components/advanced/md'
import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { isContentLeadingEcho } from '@/utils/echo'
import { formatDate } from '@/utils/other'
import { useFetch } from '@vueuse/core'
import { theToast } from '@/utils/toast'
import { localStg } from '@/utils/storage'
import { useI18n } from 'vue-i18n'

const TheMediaPlayer = defineAsyncComponent(
  () => import('@/components/advanced/media/TheMediaPlayer.vue'),
)
const TheExtensionRenderer = defineAsyncComponent(
  () => import('@/components/advanced/extension/TheExtensionRenderer.vue'),
)

type Echo = App.Api.Hub.Echo

const props = defineProps<{
  echo: Echo
}>()
const { t } = useI18n()
const isLongContent = computed(() => Array.from(props.echo.content || '').length > 200)
const previewContent = computed(() => {
  if (!isLongContent.value) return props.echo.content
  return `${Array.from(props.echo.content || '').slice(0, 200).join('')}...`
})

const fav_count = ref<number>(props.echo.fav_count)
const server_url = computed(() => props.echo.server_url)
const echo_id = computed(() => props.echo.id)
const isLikeAnimating = ref(false)
const LIKE_LIST_KEY = computed(() => `${server_url.value}_liked_echo_ids`)

watch(
  () => props.echo.fav_count,
  (next) => {
    fav_count.value = next
  },
)

const handleLikeEcho = async () => {
  isLikeAnimating.value = true
  setTimeout(() => {
    isLikeAnimating.value = false
  }, 250)

  const likedEchoIds: string[] = localStg.getItem(LIKE_LIST_KEY.value) || []
  if (likedEchoIds.includes(echo_id.value)) {
    theToast.info(String(t('hubEcho.alreadyLiked')))
    return
  }

  const { error, data } = await useFetch<App.Api.Response<null>>(
    `${server_url.value}/api/echo/like/${echo_id.value}`,
  )
    .put()
    .json()

  if (error.value || data.value?.code !== 1) {
    theToast.error(String(t('hubEcho.likeFailed')))
  } else {
    fav_count.value += 1
    likedEchoIds.push(echo_id.value)
    localStg.setItem(LIKE_LIST_KEY.value, likedEchoIds)
    theToast.success(String(t('hubEcho.likeSuccess')))
  }
}
</script>

<style scoped lang="css">
.hub-echo-card::before {
  content: '';
  position: absolute;

  top: 1.25rem;
  left: 0;
  width: 2px;
  height: 1rem;
  border-radius: 0 2px 2px 0;
  background: var(--color-accent);
  opacity: 0.85;
}

@media (width >= 640px) {
  .hub-echo-card::before {
    top: 1.4375rem;
    height: 1.125rem;
  }
}

.hub-echo-body :deep(p),
.hub-echo-body :deep(li) {
  font-size: 0.9rem;
  line-height: 1.55;
}

.hub-echo-body :deep(p) {
  margin: 0 0 0.55rem;
}

.hub-echo-body :deep(p:last-child) {
  margin-bottom: 0;
}

.hub-echo-body--clamped {
  position: relative;
  max-height: 18rem;
  overflow: hidden;
}

.hub-echo-body--clamped::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 5rem;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, var(--color-bg-surface));
}

.hub-echo-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0;
  color: var(--color-accent);
  font-size: 0.75rem;
  font-weight: 600;
  border-top: 1px solid var(--color-border-subtle);
}

/* Gallery 各 layout 内部硬编码了 w-[88%] mx-auto + mb-4，
   在 hub 卡片里需要拉满到与正文同宽，并去掉外层多余的下边距（外部已用 mt/mb 控制） */
.hub-echo-body :deep(.image-gallery-container) > div {
  width: 100%;
  margin-left: 0;
  margin-right: 0;
  margin-bottom: 0;
}
</style>
