<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <main class="init-page">
    <div class="init-card">
      <span class="init-card__clip" aria-hidden="true"></span>
      <TheInitIntro />
      <TheInitForm
        :email="form.email"
        :username="form.username"
        :password="form.password"
        :site-title="form.siteTitle"
        :submitting="submitting"
        @update:email="form.email = $event"
        @update:username="form.username = $event"
        @update:password="form.password = $event"
        @update:site-title="form.siteTitle = $event"
        @submit="onSubmit"
      />
      <p class="init-foot">Powered by Ech0</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useInitStore, useSettingStore, useUserStore } from '@/stores'
import { theToast } from '@/utils/toast'
import TheInitForm from './TheInitForm.vue'
import TheInitIntro from './TheInitIntro.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const initStore = useInitStore()
const userStore = useUserStore()
const settingStore = useSettingStore()
const { isLogin } = storeToRefs(userStore)
const { t } = useI18n()
const submitting = ref(false)
const form = reactive({
  email: '',
  username: '',
  password: '',
  siteTitle: '',
})

onMounted(async () => {
  await initStore.getStatus().catch(() => undefined)
  if (initStore.initialized || initStore.ownerExists) {
    await router.replace({ name: 'auth' })
  }
})

/**
 * The Huma init endpoint is framework-neutral and cannot mint a session, so the
 * client signs in with the credentials it already holds. Success lands the new
 * owner on the editor instead of a second login form.
 */
const enterAfterInit = async () => {
  await userStore.login({ username: form.username.trim(), password: form.password })
  if (isLogin.value) {
    // The SPA read the settings before this owner existed, so the freshly
    // captured site name would still look unset downstream.
    await settingStore.init()
    await router.replace({ name: 'home', query: { tab: 'publish' } })
    return
  }
  theToast.info(String(t('init.autoLoginFailed')))
  await router.replace({ name: 'auth' })
}

const onSubmit = async () => {
  if (!form.email || !form.username || !form.password || submitting.value) {
    return
  }

  submitting.value = true
  try {
    const siteTitle = form.siteTitle.trim()
    const res = await initStore.initOwner({
      email: form.email.trim(),
      username: form.username.trim(),
      password: form.password,
      ...(siteTitle ? { site_title: siteTitle } : {}),
    })
    if (res.code === 1) {
      theToast.success(res.msg || String(t('init.initDone')))
      await enterAfterInit()
      return
    }
    if (initStore.initialized || initStore.ownerExists) {
      theToast.success(String(t('init.alreadyInitializedRedirect')))
      await router.replace({ name: 'auth' })
      return
    }
    theToast.error(res.msg || String(t('init.initFailed')))
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.init-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  width: 100%;
  padding: 1.5rem 1rem;
}

.init-card {
  position: relative;
  width: min(92vw, 20rem);
  padding: 1.4rem 1.25rem 1.1rem;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: 2px 18px 2px 2px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-text-primary) 4%, transparent),
    0 1px 2px color-mix(in srgb, var(--color-text-primary) 5%, transparent),
    0 30px 46px -40px color-mix(in srgb, var(--color-text-primary) 55%, transparent);
  transform: rotate(0.3deg);
  animation: init-settle 760ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.init-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.init-card__clip {
  position: absolute;
  z-index: 2;
  top: -0.42rem;
  left: 1.5rem;
  width: 0.6rem;
  height: 1.35rem;
  border: 1.5px solid color-mix(in srgb, var(--color-text-primary) 42%, transparent);
  border-radius: 0.38rem;
  transform: rotate(8deg);
  box-shadow: 0 2px 3px -2px color-mix(in srgb, var(--color-text-primary) 35%, transparent);
}

.init-card__clip::after {
  content: '';
  position: absolute;
  inset: 0.17rem 0.11rem 0.2rem;
  border: 1px solid color-mix(in srgb, var(--color-text-primary) 30%, transparent);
  border-radius: 0.28rem;
}

.init-foot {
  margin: 1rem 0 0;
  padding-top: 0.6rem;
  border-top: 1px dashed color-mix(in srgb, var(--color-border-strong) 55%, transparent);
  text-align: center;
  font-family: var(--font-family-display);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

@keyframes init-settle {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: rotate(1.2deg) translateY(10px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: rotate(0.3deg) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .init-card {
    animation: none;
  }
}

@media (width <= 480px) {
  .init-page {
    padding: 1rem 0.7rem;
  }

  .init-card {
    width: 100%;
    padding: 1.2rem 1rem 0.9rem;
  }
}
</style>
