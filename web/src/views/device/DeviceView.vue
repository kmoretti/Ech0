<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import BaseOtpInput from '@/components/common/BaseOtpInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'
import ScopeAccordion from '@/components/common/ScopeAccordion.vue'
import { fetchDeviceApprove, fetchDevicePending } from '@/service/api/device'
import { resolveAvatarUrl } from '@/service/request/shared'
import { useSettingStore, useUserStore } from '@/stores'
import { theToast } from '@/utils/toast'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const settingStore = useSettingStore()
const { user } = storeToRefs(userStore)
const { SystemSetting } = storeToRefs(settingStore)

/** Codes are 8 letters/digits; the hyphen is decoration the server strips anyway. */
function sanitizeCode(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

const userCode = ref(sanitizeCode(typeof route.query.code === 'string' ? route.query.code : ''))
const pending = ref<App.Api.Device.PendingInfo | null>(null)
const approved = ref(false)
const approving = ref(false)
const lookupFailed = ref(false)
const expired = ref(false)
const remaining = ref(0)

const siteName = computed(() => String(SystemSetting.value?.server_name || 'Ech0'))
const accountAvatar = computed(() =>
  resolveAvatarUrl(user.value?.avatar || SystemSetting.value?.server_logo),
)
const username = computed(() => user.value?.username || '')
/** Approving mints an access token, which the backend restricts to admins. */
const canApprove = computed(() => user.value?.is_admin === true)

const codeReady = computed(() => userCode.value.length === 8)
const formattedCode = computed(() =>
  codeReady.value ? `${userCode.value.slice(0, 4)}-${userCode.value.slice(4)}` : '',
)
/** Drives the OTP ring burst / shake; the success state is set by `approve`. */
const approveSucceeded = ref(false)
const codeStatus = computed<'idle' | 'success' | 'error'>(() => {
  if (approveSucceeded.value) return 'success'
  return lookupFailed.value ? 'error' : 'idle'
})
const codeSlotLabel = (index: number, total: number) =>
  String(t('devicePage.codeSlotLabel', { index: index + 1, total }))
const remainingText = computed(
  () => `${Math.floor(remaining.value / 60)}:${String(remaining.value % 60).padStart(2, '0')}`,
)

let debounce: ReturnType<typeof setTimeout> | undefined
let successTimer: ReturnType<typeof setTimeout> | undefined
let ticker: ReturnType<typeof setInterval> | undefined
let deadline = 0

function stopTicker() {
  if (ticker === undefined) return
  clearInterval(ticker)
  ticker = undefined
}

function tick() {
  remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  if (remaining.value > 0) return
  stopTicker()
  if (!pending.value) return
  pending.value = null
  expired.value = true
}

function startTicker(seconds: number) {
  stopTicker()
  deadline = Date.now() + seconds * 1000
  remaining.value = Math.max(0, seconds)
  if (remaining.value > 0) ticker = setInterval(tick, 1000)
}

async function lookup(code: string) {
  const res = await fetchDevicePending(code)
  // A newer keystroke may have superseded this request; only apply matching results.
  if (code !== formattedCode.value) return
  if (res.code === 1 && res.data) {
    if (res.data.expires_in <= 0) {
      expired.value = true
      return
    }
    startTicker(res.data.expires_in)
    pending.value = res.data
    return
  }
  lookupFailed.value = true
}

function scheduleLookup() {
  clearTimeout(debounce)
  stopTicker()
  pending.value = null
  lookupFailed.value = false
  expired.value = false
  if (!codeReady.value) return
  const code = formattedCode.value
  debounce = setTimeout(() => void lookup(code), 300)
}

async function approve() {
  if (!pending.value || approving.value) return
  approving.value = true
  try {
    const res = await fetchDeviceApprove(formattedCode.value)
    if (res.code === 1) {
      pending.value = null
      stopTicker()
      approveSucceeded.value = true
      // Let the code rings finish drawing before the panel swaps to the receipt.
      successTimer = setTimeout(() => {
        approved.value = true
      }, 760)
      return
    }
    theToast.error(t('devicePage.approveFailed'))
  } finally {
    approving.value = false
  }
}

/** Logout keeps the code in the URL so the next account lands back on the approval. */
async function switchAccount() {
  const target = formattedCode.value ? `/device?code=${formattedCode.value}` : '/device'
  await userStore.logout()
  await router.push({ name: 'auth', query: { redirect: target } })
}

// Typing a complete code is the intent to look it up — there is no separate submit step.
watch(userCode, scheduleLookup)

onMounted(() => {
  if (codeReady.value) void lookup(formattedCode.value)
})

onBeforeUnmount(() => {
  clearTimeout(debounce)
  clearTimeout(successTimer)
  stopTicker()
})
</script>

<template>
  <main class="device-page">
    <div class="device-sheet">
      <span class="device-sheet__clip" aria-hidden="true"></span>

      <header class="device-brand">
        <span class="device-brand__name">{{ siteName }}</span>
      </header>

      <div
        class="mt-5 flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] px-3 py-2"
      >
        <img
          :src="accountAvatar"
          alt=""
          loading="lazy"
          class="w-6 h-6 shrink-0 rounded-full object-cover ring-1 ring-[var(--color-border-subtle)]"
        />
        <p class="flex min-w-0 flex-1 items-baseline gap-1.5 text-xs">
          <span class="shrink-0 text-[var(--color-text-muted)]">{{
            t('devicePage.signedInAs')
          }}</span>
          <span class="truncate font-medium text-[var(--color-text-primary)]">{{ username }}</span>
        </p>
        <button
          type="button"
          class="shrink-0 cursor-pointer text-xs text-[var(--color-accent)] hover:opacity-80"
          @click="switchAccount"
        >
          {{ t('devicePage.switchAccount') }}
        </button>
      </div>

      <div v-if="approved" class="mt-10 text-center">
        <p class="text-sm text-[var(--color-text-primary)]">{{ t('devicePage.approved') }}</p>
        <BaseButton class="mt-4 px-3 py-1.5 text-sm" @click="router.push({ name: 'home' })">
          {{ t('devicePage.backHome') }}
        </BaseButton>
      </div>

      <div v-else class="mt-9">
        <BaseOtpInput
          v-model="userCode"
          :label="t('devicePage.codeLabel')"
          :length="8"
          :status="codeStatus"
          :disabled="approving || approveSucceeded"
          :slot-label="codeSlotLabel"
          autofocus
        />
        <p v-if="lookupFailed" class="mt-2 text-xs text-[var(--color-danger)]">
          {{ t('devicePage.lookupFailed') }}
        </p>
        <p v-else-if="expired" class="mt-2 text-xs text-[var(--color-danger)]">
          {{ t('devicePage.expired') }}
        </p>
        <p v-else class="mt-2 text-xs text-[var(--color-text-muted)]">
          {{ t('devicePage.codeHelp') }}
        </p>

        <section v-if="pending" class="mt-6 space-y-4">
          <div class="flex items-baseline gap-1.5 text-sm">
            <span class="shrink-0 text-[var(--color-text-muted)]">{{
              t('devicePage.client')
            }}</span>
            <span class="font-medium text-[var(--color-text-primary)] break-all">
              {{ pending.client_name }}
            </span>
          </div>

          <ScopeAccordion :scopes="pending.scopes" />

          <div class="flex items-center justify-between text-xs">
            <span class="text-[var(--color-text-muted)]">{{ t('devicePage.expiresIn') }}</span>
            <span class="font-mono tabular-nums text-[var(--color-text-secondary)]">
              {{ remainingText }}
            </span>
          </div>

          <button
            type="button"
            :disabled="approving || !canApprove"
            class="w-full cursor-pointer px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--dialog-confirm-text-color)] text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            @click="approve"
          >
            {{ approving ? t('devicePage.approving') : t('devicePage.approve') }}
          </button>
          <p v-if="!canApprove" class="text-xs text-[var(--color-danger)]">
            {{ t('devicePage.adminRequired') }}
          </p>
        </section>

        <p class="mt-8 text-xs leading-relaxed text-[var(--color-text-muted)]">
          {{ t('devicePage.securityHint') }}
        </p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.device-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 1.5rem 1rem;
}

.device-sheet {
  position: relative;
  width: min(92vw, 25rem);
  padding: 1.6rem 1.35rem 1.4rem;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: 2px 18px 2px 2px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-text-primary) 4%, transparent),
    0 1px 2px color-mix(in srgb, var(--color-text-primary) 5%, transparent),
    0 30px 46px -40px color-mix(in srgb, var(--color-text-primary) 55%, transparent);
  transform: rotate(-0.28deg);
  animation: device-settle 760ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.device-sheet::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.device-sheet__clip {
  position: absolute;
  z-index: 2;
  top: -0.42rem;
  left: 1.6rem;
  width: 0.6rem;
  height: 1.35rem;
  border: 1.5px solid color-mix(in srgb, var(--color-text-primary) 42%, transparent);
  border-radius: 0.38rem;
  transform: rotate(8deg);
  box-shadow: 0 2px 3px -2px color-mix(in srgb, var(--color-text-primary) 35%, transparent);
}

.device-sheet__clip::after {
  content: '';
  position: absolute;
  inset: 0.17rem 0.11rem 0.2rem;
  border: 1px solid color-mix(in srgb, var(--color-text-primary) 30%, transparent);
  border-radius: 0.28rem;
}

.device-brand {
  display: flex;
  justify-content: center;
  padding-bottom: 0.7rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-border-strong) 60%, transparent);
}

.device-brand__name {
  font-family: var(--font-family-display);
  font-size: 1.3rem;
  font-style: italic;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text-primary);
}

@keyframes device-settle {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: rotate(1.1deg) translateY(10px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: rotate(-0.28deg) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .device-sheet {
    animation: none;
  }
}
</style>
