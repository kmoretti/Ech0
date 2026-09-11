<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <PanelCard>
    <div class="w-full">
      <div class="flex flex-row items-center justify-between mb-3">
        <h1 class="text-[var(--color-text-primary)] font-bold text-lg">
          {{ t('userSetting.title') }}
        </h1>
        <div class="flex flex-row items-center justify-end">
          <BaseEditCapsule
            :editing="editMode"
            :apply-title="t('commonUi.apply')"
            :cancel-title="t('commonUi.cancel')"
            :edit-title="t('commonUi.edit')"
            @apply="handleUpdateUser"
            @toggle="editMode = !editMode"
          />
        </div>
      </div>

      <div class="flex justify-start items-center mb-2">
        <img
          :src="avatarSrc"
          :alt="t('userSetting.avatarAlt')"
          loading="lazy"
          decoding="async"
          class="w-12 h-12 rounded-full ml-2 mr-9 ring-1 ring-[var(--color-border-subtle)] shadow-[var(--shadow-sm)]"
        />
        <div>
          <input
            id="file-input"
            class="hidden"
            type="file"
            accept="image/*"
            ref="fileInput"
            @change="handleUploadImage"
          />
          <BaseButton
            v-if="editMode"
            class="rounded-md text-center w-auto text-align-center h-8 md:ml-5"
            @click="handTriggerUpload"
          >
            {{ t('userSetting.changeAvatar') }}
          </BaseButton>
          <BaseButton
            v-if="editMode && hasCustomAvatar"
            class="rounded-md text-center w-auto text-align-center h-8 mt-2 md:ml-5"
            @click="handleResetAvatar"
          >
            {{ t('userSetting.resetAvatar') }}
          </BaseButton>
        </div>
      </div>

      <div
        class="flex flex-row items-center justify-start text-[var(--color-text-secondary)] gap-2 min-h-10 py-1"
      >
        <h2 class="font-semibold min-w-28 md:min-w-36 shrink-0 break-words leading-5">
          {{ t('userSetting.username') }}:
        </h2>
        <span v-if="!editMode" class="flex-1 min-w-0 truncate" v-tooltip="user?.username">{{
          user?.username
        }}</span>
        <BaseInput
          v-else
          v-model="userInfo.username"
          type="text"
          :placeholder="t('userSetting.usernamePlaceholder')"
          class="w-full max-w-52 py-1!"
        />
      </div>

      <div
        class="flex flex-row items-center justify-start text-[var(--color-text-secondary)] gap-2 min-h-10 py-1"
      >
        <h2 class="font-semibold min-w-28 md:min-w-36 shrink-0 break-words leading-5">
          {{ t('userSetting.password') }}:
        </h2>
        <span v-if="!editMode" class="flex-1 min-w-0 truncate">******</span>
        <BaseInput
          v-else
          v-model="userInfo.password"
          type="password"
          :placeholder="t('userSetting.passwordPlaceholder')"
          class="w-full max-w-52 py-1!"
          autocomplete="off"
        />
      </div>
      <div
        class="flex flex-row items-center justify-start text-[var(--color-text-secondary)] gap-2 min-h-10 py-1"
      >
        <h2 class="font-semibold min-w-28 md:min-w-36 shrink-0 break-words leading-5">
          {{ t('userSetting.email') }}:
        </h2>
        <span v-if="!editMode" class="flex-1 min-w-0 truncate" v-tooltip="user?.email || ''">{{
          user?.email || '-'
        }}</span>
        <BaseInput
          v-else
          v-model="userInfo.email"
          type="email"
          :placeholder="t('userSetting.emailPlaceholder')"
          class="w-full max-w-52 py-1!"
        />
      </div>
      <div
        class="flex flex-row items-center justify-start text-[var(--color-text-secondary)] gap-2 min-h-10 py-1"
      >
        <h2 class="font-semibold min-w-28 md:min-w-36 shrink-0 break-words leading-5">
          {{ t('userSetting.locale') }}:
        </h2>
        <span v-if="!editMode" class="flex-1 min-w-0 truncate">{{ localeLabel }}</span>
        <div v-else class="w-full max-w-52">
          <BaseSelect v-model="userInfo.locale" :options="localeOptions" class="w-full h-8" />
        </div>
      </div>
    </div>
  </PanelCard>
</template>

<script setup lang="ts">
import PanelCard from '@/layout/PanelCard.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseSelect from '@/components/common/BaseSelect.vue'
import BaseEditCapsule from '@/components/common/BaseEditCapsule.vue'
import { computed, ref, onMounted } from 'vue'
import { fetchGetCurrentUser, fetchUpdateUser } from '@/service/api'
import { theToast } from '@/utils/toast'
import { storeToRefs } from 'pinia'
import { useSettingStore, useUserStore } from '@/stores'
import { DEFAULT_USER_AVATAR_URL, resolveAvatarUrl } from '@/service/request/shared'
import { FILE_CATEGORY } from '@/constants/file'
import { deleteFileById, resolveManagedUploadStorageType, useFileQueue } from '@/lib/file'
import { useI18n } from 'vue-i18n'
import { setI18nLocale, LOCALE_ENDONYMS, LOCALE_OPTIONS, type AppLocale } from '@/locales'
import { useBaseDialog } from '@/composables/useBaseDialog'

const userStore = useUserStore()
const settingStore = useSettingStore()
const { t } = useI18n()
const { refreshCurrentUser } = userStore
const { user } = storeToRefs(userStore)
const { S3Setting } = storeToRefs(settingStore)
const userInfo = ref<App.Api.User.UserInfo>({
  username: '',
  password: '',
  email: '',
  is_admin: false,
  avatar: '',
  avatar_file_id: '',
  reset_avatar: false,
  locale: 'zh-CN',
})

const editMode = ref<boolean>(false)
const avatarSrc = computed(() => resolveAvatarUrl(user.value?.avatar, DEFAULT_USER_AVATAR_URL))
const hasCustomAvatar = computed(() => Boolean(userInfo.value.avatar || userInfo.value.avatar_file_id))
// 用户界面语言统一用 endonym 选项（与头部切换器、站点默认语言一致）。
const localeOptions = LOCALE_OPTIONS
const localeLabel = computed(
  () => LOCALE_ENDONYMS[userInfo.value.locale as AppLocale] || LOCALE_ENDONYMS['zh-CN'],
)
const { enqueueUpload, waitForTask, clearFinishedUploads } = useFileQueue()
const { openConfirm } = useBaseDialog()

const handleUpdateUser = async () => {
  await fetchUpdateUser(userInfo.value)
    .then((res) => {
      if (res.code === 1) {
        theToast.success(res.msg)
        void setI18nLocale(userInfo.value.locale)
        editMode.value = false
        userInfo.value.reset_avatar = false
      }
    })
    .finally(() => {
      refreshCurrentUser()
    })
    .catch((err) => {
      console.error(err)
    })
}

const fileInput = ref<HTMLInputElement | null>(null)
const handTriggerUpload = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}
const handleUploadImage = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    await settingStore.getS3Setting()
    const taskId = enqueueUpload({
      file,
      storageType: resolveManagedUploadStorageType(S3Setting.value.enable),
      category: FILE_CATEGORY.IMAGE,
    })
    const task = await theToast.promise(waitForTask(taskId), {
      loading: String(t('userSetting.avatarUploading')),
      success: String(t('userSetting.avatarUploadSuccess')),
      error: String(t('userSetting.uploadFailed')),
    })

    if (task.result?.url) {
      userInfo.value.avatar = task.result.url
      userInfo.value.avatar_file_id = task.result.id
      userInfo.value.reset_avatar = false
      if (user.value) user.value.avatar = task.result.url
    }
  } catch (err) {
    console.error('上传异常', err)
  } finally {
    clearFinishedUploads()
    target.value = ''
  }
}

const deleteFileBestEffort = async (fileId?: string) => {
  const id = String(fileId || '').trim()
  if (!id) return
  try {
    await deleteFileById(id, { silentError: true })
  } catch {
    theToast.warning(String(t('userSetting.resetAvatarDeleteFailed')))
  }
}

const handleResetAvatar = () => {
  const oldFileId = userInfo.value.avatar_file_id || user.value?.avatar_file_id
  openConfirm({
    title: String(t('userSetting.resetAvatarConfirmTitle')),
    description: String(t('userSetting.resetAvatarConfirmDesc')),
    onConfirm: async () => {
      const payload: App.Api.User.UserInfo = {
        ...userInfo.value,
        avatar: '',
        avatar_file_id: '',
        reset_avatar: true,
      }
      const res = await fetchUpdateUser(payload)
      if (res.code !== 1) return
      userInfo.value.avatar = ''
      userInfo.value.avatar_file_id = ''
      userInfo.value.reset_avatar = false
      if (user.value) {
        user.value.avatar = ''
        user.value.avatar_file_id = ''
      }
      await deleteFileBestEffort(oldFileId)
      await refreshCurrentUser()
      theToast.success(String(t('userSetting.resetAvatarSuccess')))
    },
  })
}

onMounted(() => {
  void settingStore.getS3Setting()
  fetchGetCurrentUser().then((res) => {
    if (res.code === 1) {
      userInfo.value.username = res.data.username
      userInfo.value.password = res.data.password || ''
      userInfo.value.avatar = res.data.avatar || ''
      userInfo.value.avatar_file_id = res.data.avatar_file_id || ''
      userInfo.value.email = res.data.email || ''
      userInfo.value.is_admin = res.data.is_admin
      userInfo.value.locale = res.data.locale || 'zh-CN'
    }
  })
})
</script>

<style scoped></style>
