<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div v-if="AgentSetting.enable" class="px-2">
    <div class="widget bg-transparent! w-full max-w-[19rem] mx-auto rounded-md p-4">
      <div class="recent-head mb-3">
        <div class="recent-title-wrap">
          <div class="recent-title">Recent</div>
          <div class="recent-title-accent">AI</div>
        </div>
      </div>

      <div class="recent-body">
        <div class="recent-card">
          <div v-if="!loading" class="recent-content">
            <TheMdPreview :content="recent" />
          </div>
          <div v-else>
            <div class="recent-loading">{{ t('recentCard.generating') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { fetchGetRecent } from '@/service/api'
import { onMounted, ref } from 'vue'
import { TheMdPreview } from '@/components/advanced/md'
import { useSettingStore } from '@/stores'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import {
  HOME_CACHE_TTL,
  HOME_RECENT_CACHE_KEY,
  readHomeCache,
  refreshHomeCacheInBackground,
  writeHomeCache,
} from '@/utils/home-cache'

type RecentCachePayload = {
  recent: string
}

const settingStore = useSettingStore()
const { AgentSetting } = storeToRefs(settingStore)
const { t } = useI18n()

const recent = ref<string>(String(t('recentCard.mysteriousRecent')))
const loading = ref<boolean>(true)

onMounted(() => {
  if (AgentSetting.value.enable) {
    const fetchRecentPayload = async (): Promise<RecentCachePayload | null> => {
      const res = await fetchGetRecent()
      if (res.code !== 1) return null
      return { recent: res.data }
    }

    const cached = readHomeCache<RecentCachePayload>(HOME_RECENT_CACHE_KEY)
    if (cached) {
      recent.value = cached.data.recent
      loading.value = false
      if (!cached.fresh) {
        void refreshHomeCacheInBackground(HOME_RECENT_CACHE_KEY, HOME_CACHE_TTL, fetchRecentPayload)
      }
      return
    }

    fetchRecentPayload()
      .then((payload) => {
        if (!payload) return
        recent.value = payload.recent
        writeHomeCache(HOME_RECENT_CACHE_KEY, payload, HOME_CACHE_TTL)
      })
      .finally(() => {
        loading.value = false
      })
  }
})
</script>
<style scoped>
.recent-head {
  display: flex;
  align-items: end;
  justify-content: flex-end;
}

.recent-title-wrap {
  line-height: 0.9;
  text-align: right;
}

.recent-title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 26px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.recent-title-accent {
  font-family: var(--font-family-handwritten);
  color: var(--color-accent);
  font-size: 20px;
  font-weight: 700;
  margin-top: -2px;
}

.recent-body {
  width: 100%;
}

.recent-card {
  position: relative;
  width: 100%;
  border: 1px solid var(--color-border-subtle);
  background-color: var(--recent-card-bg);
  box-shadow: 0 8px 18px rgb(20 20 20 / 4%);
  padding: 15px 13px 12px;
}

.recent-card::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -7px;
  transform: translateX(-50%);
  width: 42px;
  height: 12px;
  border-radius: 2px;
  background: var(--recent-card-before-bg);
  box-shadow:
    0 1px 0 rgb(255 255 255 / 30%) inset,
    0 1px 2px rgb(0 0 0 / 8%);
  opacity: 0.95;
}

.recent-content {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.65;
  white-space: normal;
  overflow-wrap: anywhere;
}

.recent-loading {
  color: var(--color-text-secondary);
  font-size: 13px;
}

:deep(.echo-markdown p) {
  color: var(--color-text-secondary) !important;
  font-size: 13px !important;
  line-height: 1.65 !important;
}
</style>
