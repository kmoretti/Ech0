<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <footer v-if="footerContent" class="wall-footer">
    <a
      v-if="footerLink"
      :href="footerLink"
      target="_blank"
      rel="noopener noreferrer"
      class="wall-footer__link"
    >
      {{ footerContent }}
    </a>
    <span v-else class="wall-footer__text">{{ footerContent }}</span>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingStore } from '@/stores'

const settingStore = useSettingStore()
const { SystemSetting } = storeToRefs(settingStore)

const footerContent = computed(
  () => SystemSetting.value.footer_content?.trim() || SystemSetting.value.ICP_number?.trim() || '',
)
const footerLink = computed(() => SystemSetting.value.footer_link?.trim() || '')
</script>

<style scoped>
.wall-footer {
  padding: 0.7rem 0.6rem 0.2rem;
  border-top: 1px dashed rgb(92 72 48 / 18%);
  font-size: 0.62rem;
  line-height: 1.6;
  letter-spacing: 0.03em;
  color: rgb(58 50 40 / 58%);
  text-align: center;
}

.wall-footer__link,
.wall-footer__text {
  overflow-wrap: anywhere;
}

.wall-footer__link {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px dashed rgb(92 72 48 / 28%);
  transition:
    color 160ms ease,
    border-color 160ms ease;
}

.wall-footer__link:hover {
  color: rgb(58 50 40 / 86%);
  border-bottom-color: rgb(92 72 48 / 50%);
}

.wall-footer__link:focus-visible {
  outline: 2px solid rgb(90 70 45 / 70%);
  outline-offset: 2px;
}
</style>
