<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import {
  fetchOAuthConsent,
  submitOAuthConsent,
  type OAuthAuthorizeParams,
  type OAuthConsentContext,
} from '@/service/api/oauthserver'
import ScopeAccordion from '@/components/common/ScopeAccordion.vue'
import { useUserStore } from '@/stores'

const { t } = useI18n()
const route = useRoute()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

function queryString(key: string): string {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

const params = computed<OAuthAuthorizeParams>(() => ({
  client_id: queryString('client_id'),
  redirect_uri: queryString('redirect_uri'),
  response_type: queryString('response_type') || 'code',
  scope: queryString('scope'),
  state: queryString('state'),
  resource: queryString('resource'),
  code_challenge: queryString('code_challenge'),
  code_challenge_method: queryString('code_challenge_method') || 'S256',
}))

const consent = ref<OAuthConsentContext | null>(null)
const loading = ref(true)
const submitting = ref(false)
/** Load failure replaces the card; action failure keeps it on screen. */
const loadError = ref('')
const actionError = ref('')

const canApprove = computed(() => user.value?.is_admin === true)
const requestIncomplete = computed(
  () => !params.value.client_id || !params.value.redirect_uri || !params.value.code_challenge,
)

async function load() {
  if (requestIncomplete.value) {
    loadError.value = t('oauthConsent.invalidRequest')
    loading.value = false
    return
  }
  try {
    const res = await fetchOAuthConsent(params.value)
    if (res.code === 1 && res.data) {
      consent.value = res.data
    } else {
      loadError.value = res.msg || t('oauthConsent.loadFailed')
    }
  } catch (error) {
    loadError.value =
      error instanceof Error && error.message ? error.message : t('oauthConsent.loadFailed')
  } finally {
    loading.value = false
  }
}

async function decide(decision: 'approve' | 'deny') {
  if (submitting.value || requestIncomplete.value) return
  submitting.value = true
  actionError.value = ''
  try {
    const res = await submitOAuthConsent({ ...params.value, decision })
    if (res.code === 1 && res.data?.redirect_url) {
      window.location.assign(res.data.redirect_url)
      return
    }
    actionError.value = res.msg || t('oauthConsent.failed')
  } catch (error) {
    actionError.value =
      error instanceof Error && error.message ? error.message : t('oauthConsent.failed')
  } finally {
    // A failed submit must leave both buttons usable for a retry.
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="consent-page">
    <div class="consent-sheet">
      <span class="consent-sheet__clip" aria-hidden="true"></span>

      <header class="consent-brand">
        <h1 class="consent-brand__title">
          {{ t('oauthConsent.title') }}
        </h1>
        <p class="text-xs text-[var(--color-text-muted)]">{{ t('oauthConsent.subtitle') }}</p>
      </header>

      <p v-if="loadError" class="mt-6 text-xs text-[var(--color-danger)] break-words">
        {{ loadError }}
      </p>

      <section v-if="loading" class="mt-10 text-center text-sm text-[var(--color-text-muted)]">
        {{ t('oauthConsent.loading') }}
      </section>

      <section v-else-if="consent" class="mt-6 space-y-5">
        <div class="rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] px-3 py-2.5">
          <p class="text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
            {{ t('oauthConsent.client') }}
          </p>
          <p class="mt-0.5 text-sm font-medium text-[var(--color-text-primary)] break-all">
            {{ consent.client_name }}
          </p>
          <p
            v-if="consent.client_uri"
            class="mt-0.5 text-xs text-[var(--color-text-muted)] break-all"
          >
            {{ consent.client_uri }}
          </p>
        </div>

        <ScopeAccordion :scopes="consent.scopes" />

        <p class="text-xs text-[var(--color-text-muted)] break-all">
          {{ t('oauthConsent.resource') }}:
          <span class="font-medium text-[var(--color-text-primary)]">
            {{ consent.resource_name || consent.resource }}
          </span>
          <span v-if="consent.resource_name" class="mt-0.5 block">{{ consent.resource }}</span>
        </p>

        <p v-if="actionError" class="text-xs text-[var(--color-danger)] break-words">
          {{ actionError }}
        </p>

        <div class="flex gap-2">
          <button
            type="button"
            :disabled="submitting"
            class="flex-1 cursor-pointer px-4 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] text-sm font-medium text-[var(--color-text-primary)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
            @click="decide('deny')"
          >
            {{ t('oauthConsent.deny') }}
          </button>
          <button
            type="button"
            :disabled="submitting || !canApprove"
            class="flex-1 cursor-pointer px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-[var(--dialog-confirm-text-color)] text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            @click="decide('approve')"
          >
            {{ submitting ? t('oauthConsent.approving') : t('oauthConsent.approve') }}
          </button>
        </div>

        <p v-if="!canApprove" class="text-xs text-[var(--color-danger)]">
          {{ t('oauthConsent.adminRequired') }}
        </p>
        <p class="text-xs leading-relaxed text-[var(--color-text-muted)]">
          {{ t('oauthConsent.securityHint') }}
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.consent-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 1.5rem 1rem;
}

.consent-sheet {
  position: relative;
  width: min(92vw, 28rem);
  padding: 1.6rem 1.35rem 1.4rem;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: 2px 18px 2px 2px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-text-primary) 4%, transparent),
    0 1px 2px color-mix(in srgb, var(--color-text-primary) 5%, transparent),
    0 30px 46px -40px color-mix(in srgb, var(--color-text-primary) 55%, transparent);
  transform: rotate(-0.24deg);
  animation: consent-settle 760ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.consent-sheet::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.consent-sheet__clip {
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

.consent-sheet__clip::after {
  content: '';
  position: absolute;
  inset: 0.17rem 0.11rem 0.2rem;
  border: 1px solid color-mix(in srgb, var(--color-text-primary) 30%, transparent);
  border-radius: 0.28rem;
}

.consent-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-border-strong) 60%, transparent);
  text-align: center;
}

.consent-brand__title {
  font-family: var(--font-family-display);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--color-text-primary);
}

@keyframes consent-settle {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: rotate(1.1deg) translateY(10px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: rotate(-0.24deg) translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .consent-sheet {
    animation: none;
  }
}
</style>
