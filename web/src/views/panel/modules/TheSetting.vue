<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="w-full px-2">
    <BaseSegmented v-model="tab" :options="tabOptions" />

    <TheSystemSetting v-if="tab === 'system'" />
    <!-- 访问令牌 -->
    <TheAccessTokenSetting v-else-if="tab === 'accessToken'" />
    <TheTagsManager v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BaseSegmented from '@/components/common/BaseSegmented.vue'
import TheSystemSetting from './TheSetting/TheSystemSetting.vue'
import TheAccessTokenSetting from './TheSetting/TheAccessTokenSetting.vue'
import TheTagsManager from '@/views/home/modules/TheEditor/TheTagsManager.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
type SettingTab = 'system' | 'accessToken' | 'tags'

const routeTab = (): SettingTab => {
  if (route.query.tab === 'accessToken') return 'accessToken'
  if (route.query.tab === 'tags') return 'tags'
  return 'system'
}

const tab = ref<SettingTab>(routeTab())
const tabOptions = computed(() => [
  { label: String(t('settingManagement.tabSystem')), value: 'system' },
  { label: String(t('settingManagement.tabAccessToken')), value: 'accessToken' },
  { label: String(t('settingManagement.tabTags')), value: 'tags' },
])

watch(
  () => route.query.tab,
  () => {
    tab.value = routeTab()
  },
)

watch(tab, (value) => {
  const nextQuery: Record<string, string> = value === 'system' ? {} : { tab: value }
  if ((route.query.tab ?? 'system') === (nextQuery.tab ?? 'system')) return
  router.replace({ name: 'panel-setting', query: nextQuery })
})
</script>
