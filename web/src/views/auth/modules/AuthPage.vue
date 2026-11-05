<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="auth-page">
    <div class="auth-card">
      <span class="auth-card__clip" aria-hidden="true"></span>

      <header class="auth-brand">
        <div>
          <p class="auth-brand__eyebrow">{{ t('starJournal.eyebrow') }} · {{ dateLabel }}</p>
          <h1 class="auth-brand__title">Ech0</h1>
        </div>
        <span class="auth-brand__postmark">{{ t('starJournal.seal') }}</span>
      </header>

      <div class="auth-body">
        <div v-if="AuthMode === 'login'">
          <div class="flex items-center justify-between gap-3 mb-3">
            <h2 class="text-lg font-bold text-[var(--color-text-muted)] leading-tight">
              {{ t('authPage.login') }}
            </h2>
            <button
              @click="AuthMode = 'register'"
              class="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition duration-200 whitespace-nowrap flex-shrink-0"
            >
              <div class="flex flex-row gap-1 items-center leading-tight">
                <span>{{ t('authPage.register') }}</span>
                <Arrow class="text-xl" />
              </div>
            </button>
          </div>
          <BaseInput
            v-model="username"
            type="text"
            :placeholder="t('authPage.usernamePlaceholder')"
            class="mb-4"
          />
          <BaseInput
            v-model="password"
            type="password"
            :placeholder="t('authPage.passwordPlaceholder')"
            class="mb-4"
          />
          <div class="flex justify-between items-center">
            <BaseButton
              @click="router.push({ name: 'home' })"
              :tooltip="t('authPage.backHome')"
              :icon="Home"
              class="rounded-md w-9 h-9 flex-shrink-0"
            />
            <div class="w-full flex items-center justify-end gap-1">
              <BaseButton
                :icon="Passkey"
                v-if="passkeySupported"
                @click="handlePasskeyLogin"
                :disabled="!!passkeyStatus && !passkeyStatus.passkey_ready"
                class="rounded-md w-9 h-9"
                :tooltip="t('authPage.passkeyLoginTitle')"
              />
              <BaseButton
                v-if="oauth2Status && oauth2Status.enabled"
                :icon="
                  oauth2Status.provider === OAuth2Provider.GITHUB
                    ? Github
                    : oauth2Status.provider === OAuth2Provider.GOOGLE
                      ? Google
                      : oauth2Status.provider === OAuth2Provider.QQ
                        ? QQ
                        : Customoauth
                "
                @click="gotoOAuth2URL"
                :disabled="!oauth2Status.oauth_ready"
                class="w-9 h-9 rounded-md"
                :tooltip="t('authPage.oauth2LoginTitle')"
              />
            </div>
            <BaseButton
              @click="handleLogin"
              class="min-w-fit px-3 h-9 rounded-md ml-1 flex-shrink-0"
            >
              <span class="text-[var(--color-text-secondary)]">{{ t('authPage.login') }}</span>
            </BaseButton>
          </div>
        </div>
        <div v-else-if="AuthMode === 'register'">
          <div class="flex items-center justify-between gap-3 mb-3">
            <h2 class="text-lg font-bold text-[var(--color-text-muted)] leading-tight">
              {{ t('authPage.register') }}
            </h2>
            <button
              @click="AuthMode = 'login'"
              class="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition duration-200 whitespace-nowrap flex-shrink-0"
            >
              <div class="flex flex-row gap-1 items-center leading-tight">
                <span>{{ t('authPage.login') }}</span>
                <Arrow class="text-xl rotate-180" />
              </div>
            </button>
          </div>
          <BaseInput
            v-model="username"
            type="text"
            :placeholder="t('authPage.usernamePlaceholder')"
            class="mb-4"
          />
          <BaseInput
            v-model="password"
            type="password"
            :placeholder="t('authPage.passwordPlaceholder')"
            class="mb-4"
          />
          <div class="flex justify-between items-center px-0.5">
            <BaseButton
              @click="router.push({ name: 'home' })"
              :tooltip="t('authPage.backHome')"
              :icon="Home"
              class="rounded-md w-9 h-9"
            />
            <BaseButton @click="handleRegister" class="rounded-md min-w-fit px-3">
              <span class="text-[var(--color-text-secondary)]">{{ t('authPage.register') }}</span>
            </BaseButton>
          </div>
        </div>
      </div>

      <p class="auth-foot">Powered by Ech0</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import { useUserStore } from '@/stores'
import Arrow from '@/components/icons/arrow.vue'
import Passkey from '@/components/icons/passkey.vue'
import Home from '@/components/icons/home.vue'
import Github from '@/components/icons/github.vue'
import Google from '@/components/icons/google.vue'
import QQ from '@/components/icons/qq.vue'
import Customoauth from '@/components/icons/customoauth.vue'
import { fetchGetOAuth2Status, fetchGetPasskeyStatus } from '@/service/api'
import { OAuth2Provider } from '@/enums/enums'
import { fetchPasskeyLoginBegin, fetchPasskeyLoginFinish } from '@/service/api'
import { theToast } from '@/utils/toast'
import { base64urlToUint8Array, uint8ArrayToBase64url } from '@/utils/other'
import { useI18n } from 'vue-i18n'

const AuthMode = ref<'login' | 'register'>('login')
const username = ref<string>('')
const password = ref<string>('')
const userStore = useUserStore()
const { t, locale } = useI18n()
const dateLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date()),
)
const passkeySupported = !!(window.PublicKeyCredential && navigator.credentials)

const oauth2Status = ref<App.Api.Setting.OAuth2Status | null>(null)
const passkeyStatus = ref<App.Api.Setting.PasskeyStatus | null>(null)
const baseURL =
  import.meta.env.VITE_SERVICE_BASE_URL === '/'
    ? window.location.origin
    : import.meta.env.VITE_SERVICE_BASE_URL
const oauthURL = ref<string>(`${baseURL}/oauth/github/login`)

const gotoOAuth2URL = () => {
  if (!oauth2Status.value?.oauth_ready) {
    theToast.warning(String(t('authPage.oauth2NotReady')))
    return
  }
  if (!oauthURL.value) {
    theToast.error(String(t('authPage.oauth2UrlUnavailable')))
    return
  }
  window.location.href = oauthURL.value
}

const getOAuth2Status = async () => {
  const res = await fetchGetOAuth2Status()
  if (res.code === 1) {
    oauth2Status.value = res.data
    oauthURL.value = res.data.provider
      ? `${baseURL}/oauth/${res.data.provider}/login?redirect_uri=${window.location.origin}/auth`
      : ''
  }
}

const getPasskeyStatus = async () => {
  const res = await fetchGetPasskeyStatus()
  if (res.code === 1) {
    passkeyStatus.value = res.data
  }
}

const router = useRouter()

const handleLogin = async () => {
  await userStore.login({
    username: username.value,
    password: password.value,
  })
}

type RequestOptionsJSON = Omit<
  PublicKeyCredentialRequestOptions,
  'challenge' | 'allowCredentials'
> & {
  challenge: string
  allowCredentials?: Array<{
    type: PublicKeyCredentialType
    id: string
    transports?: AuthenticatorTransport[]
  }>
}

function normalizeRequestOptions(raw: unknown): PublicKeyCredentialRequestOptions {
  if (!raw || typeof raw !== 'object') throw new Error(String(t('authPage.invalidPublicKey')))
  const o = raw as RequestOptionsJSON
  const { challenge, allowCredentials, ...rest } = o

  const allow = Array.isArray(allowCredentials)
    ? allowCredentials.map((c) => ({
        ...c,
        id: base64urlToUint8Array(c.id) as BufferSource,
      }))
    : undefined

  return {
    ...rest,
    challenge: base64urlToUint8Array(challenge) as BufferSource,
    ...(allow ? { allowCredentials: allow } : {}),
  } as PublicKeyCredentialRequestOptions
}

function credentialToJSON(cred: PublicKeyCredential) {
  const obj: Record<string, unknown> = {
    id: cred.id,
    rawId: uint8ArrayToBase64url(cred.rawId),
    type: cred.type,
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
  }

  const response: Record<string, unknown> = {}
  response.clientDataJSON = uint8ArrayToBase64url(cred.response.clientDataJSON)

  if ('authenticatorData' in cred.response) {
    const r = cred.response as AuthenticatorAssertionResponse
    response.authenticatorData = uint8ArrayToBase64url(r.authenticatorData)
    response.signature = uint8ArrayToBase64url(r.signature)
    if (r.userHandle && r.userHandle.byteLength > 0) {
      response.userHandle = uint8ArrayToBase64url(r.userHandle)
    }
  }

  obj.response = response
  return obj
}

const handlePasskeyLogin = async () => {
  if (passkeyStatus.value && !passkeyStatus.value.passkey_ready) {
    theToast.warning(String(t('authPage.passkeyNotReady')))
    return
  }
  if (!passkeySupported) return
  try {
    const begin = await fetchPasskeyLoginBegin()
    if (begin.code !== 1) return

    const options = normalizeRequestOptions(begin.data.publicKey)
    const got = await navigator.credentials.get({ publicKey: options })
    if (!got) throw new Error(String(t('authPage.getCredentialFailed')))
    const cred = got as PublicKeyCredential

    const finish = await fetchPasskeyLoginFinish(begin.data.nonce, credentialToJSON(cred))
    if (finish.code !== 1 || !finish.data?.access_token) return

    await userStore.loginWithTokenPair(finish.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(t('authPage.passkeyLoginFailed'))
    theToast.error(msg)
  }
}

const handleRegister = async () => {
  if (
    await userStore.signup({
      username: username.value,
      password: password.value,
    })
  ) {
    AuthMode.value = 'login'
  }
}

onMounted(async () => {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (code) {
    await userStore.loginWithCode(code)
    return
  }
  await Promise.all([getOAuth2Status(), getPasskeyStatus()])
})
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 1.5rem 1rem;
}

.auth-card {
  position: relative;
  width: min(92vw, 22rem);
  padding: 1.45rem 1.35rem 1.2rem;
  color: var(--color-text-primary);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: 2px 18px 2px 2px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-text-primary) 4%, transparent),
    0 1px 2px color-mix(in srgb, var(--color-text-primary) 5%, transparent),
    0 30px 46px -40px color-mix(in srgb, var(--color-text-primary) 55%, transparent);
  transform: rotate(-0.35deg);
  animation: auth-settle 760ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.auth-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.auth-card__clip {
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

.auth-card__clip::after {
  content: '';
  position: absolute;
  inset: 0.17rem 0.11rem 0.2rem;
  border: 1px solid color-mix(in srgb, var(--color-text-primary) 30%, transparent);
  border-radius: 0.28rem;
}

.auth-brand {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 1.15rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-border-strong) 70%, transparent);
}

.auth-brand__eyebrow {
  margin: 0;
  font-family: var(--font-family-display);
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.auth-brand__title {
  margin: 0.25rem 0 0;
  font-family: var(--font-family-display);
  font-size: 2.3rem;
  font-weight: 600;
  font-style: normal;
  line-height: 1;
  letter-spacing: 0.02em;
  color: var(--color-text-primary);
}

.auth-brand__postmark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.1rem;
  padding: 0.2rem 0.4rem;
  border: 1px solid color-mix(in srgb, var(--color-text-primary) 38%, transparent);
  border-radius: 1px;
  font-family: var(--font-family-display);
  font-size: 0.54rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  color: var(--color-text-secondary);
  transform: rotate(2deg);
}

.auth-body h2 {
  color: var(--color-text-primary);
  font-family: var(--font-family-display);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.auth-foot {
  margin: 1.1rem 0 0;
  padding-top: 0.65rem;
  border-top: 1px dashed color-mix(in srgb, var(--color-border-strong) 55%, transparent);
  text-align: center;
  font-family: var(--font-family-display);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

@keyframes auth-settle {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: rotate(-1.2deg) translateY(10px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: rotate(-0.35deg) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auth-card {
    animation: none;
  }
}

@media (width <= 480px) {
  .auth-page {
    padding: 1rem 0.7rem;
  }

  .auth-card {
    width: 100%;
    padding: 1.25rem 1.05rem 1rem;
  }

  .auth-brand__title {
    font-size: 2rem;
  }
}
</style>
