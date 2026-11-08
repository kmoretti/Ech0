<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <div class="echo-page">
    <article class="echo-sheet">
      <span class="echo-sheet__tape" aria-hidden="true"></span>

      <div v-if="echo" class="echo-sheet__body">
        <TheEchoDetail :echo="echo" />
        <TheEchoInteractions />
      </div>
      <div v-else class="echo-sheet__loading">
        <p>{{ t('echoPage.loadingDetail') }}</p>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TheEchoDetail from '@/components/advanced/echo/cards/TheEchoDetail.vue'
import TheEchoInteractions from '@/components/advanced/echo/cards/TheEchoInteractions.vue'
import { clearSeoOverride, setSeoOverride } from '@/composables/useSeoOverride'
import { DEFAULT_SEO_DESCRIPTION } from '@/composables/useSeoHead'
import { DEFAULT_SITE_TITLE } from '@/constants/site'
import { useEchoStore } from '@/stores'
import { getEchoImages } from '@/utils/echo'
import { absoluteSeoUrl, seoPlainText, seoTruncate } from '@/utils/seo'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const { t, locale } = useI18n()

const echoStore = useEchoStore()
const isLoading = ref(true)
const echo = ref<App.Api.Ech0.Echo | null>(null)

const getEchoFromStore = (echoId: string): App.Api.Ech0.Echo | null => {
  const idx = echoStore.echoIndexMap.get(echoId)
  if (idx !== undefined) {
    return echoStore.echoList[idx] ?? null
  }
  return null
}

const currentEchoId = () => String(route.params.echoId ?? '').trim()

const loadEcho = async () => {
  const echoId = currentEchoId()
  if (!echoId) {
    isLoading.value = false
    return
  }

  isLoading.value = true
  echo.value = getEchoFromStore(echoId)

  if (!echo.value) {
    echo.value = await echoStore.prefetchEcho(echoId)
  }
  isLoading.value = false
}

// Mirrors the server-rendered head so client navigation and the crawlable
// document agree on the card, canonical URL and BlogPosting payload.
const applyEchoSeo = () => {
  const value = echo.value
  if (!value) return

  const text = seoPlainText(value.content)
  const title = seoTruncate(text.split('\n')[0] || 'Echo', 60)
  const description = seoTruncate(text.replace(/\n/g, ' ') || DEFAULT_SEO_DESCRIPTION, 160)
  const image = absoluteSeoUrl(getEchoImages(value)[0]?.url)
  const createdAt = Number(value.created_at)
  const publishedAt =
    Number.isFinite(createdAt) && createdAt > 0
      ? new Date(createdAt * 1000).toISOString()
      : undefined

  setSeoOverride({
    path: route.path,
    title,
    description,
    type: 'article',
    image,
    publishedAt,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: title,
      description,
      datePublished: publishedAt,
      dateModified: publishedAt,
      inLanguage: locale.value,
      image,
      author: { '@type': 'Person', name: value.username || DEFAULT_SITE_TITLE },
    },
  })
}

watch(echo, applyEchoSeo)

watch(
  () => route.params.echoId,
  () => {
    clearSeoOverride()
    loadEcho()
  },
)

onMounted(loadEcho)

onBeforeUnmount(() => clearSeoOverride(route.path))
</script>

<style scoped>
.echo-page {
  display: flex;
  justify-content: center;
  width: 100%;
  min-height: 100dvh;
  padding: 2.4rem 1rem 3rem;
  background-color: #ece9e3;
  background-image:
    radial-gradient(120% 80% at 12% 0%, rgb(255 253 246 / 46%), transparent 60%),
    repeating-linear-gradient(
      0deg,
      rgb(118 92 62 / 3.5%) 0 1px,
      transparent 1px 16px,
      rgb(255 255 255 / 14%) 16px 17px,
      transparent 17px 33px
    ),
    linear-gradient(180deg, #f2efea 0%, #ece9e3 55%, #e5e1da 100%);
  background-attachment: fixed;
}

.echo-sheet {
  position: relative;
  width: min(100%, 42rem);
  padding: 1.4rem 1.5rem 1.6rem;
  background-color: color-mix(in srgb, var(--color-bg-surface) 94%, transparent);
  border: 1px solid var(--color-border-subtle);
  border-radius: 2px 14px 2px 2px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-text-primary) 4%, transparent),
    0 1px 2px color-mix(in srgb, var(--color-text-primary) 5%, transparent),
    0 28px 44px -40px color-mix(in srgb, var(--color-text-primary) 52%, transparent);
  animation: echo-sheet-in 680ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.echo-sheet::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='170' height='170'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='170' height='170' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.echo-sheet__tape {
  position: absolute;
  top: -0.58rem;
  left: 50%;
  width: 4.8rem;
  height: 1.05rem;
  transform: translateX(-50%) rotate(-1.1deg);
  background: color-mix(in srgb, var(--color-bg-surface) 62%, var(--color-border-subtle) 38%);
  opacity: 0.78;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--color-text-primary) 10%, transparent);
  pointer-events: none;
}

.echo-sheet__body {
  position: relative;
  z-index: 1;
}

.echo-sheet__loading {
  padding: 2rem 0;
  text-align: center;
  color: var(--color-text-muted);
}

@keyframes echo-sheet-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .echo-sheet {
    animation: none;
  }
}

@media (width <= 640px) {
  .echo-page {
    padding: 1.2rem 0.6rem 2rem;
  }

  .echo-sheet {
    padding: 1.1rem 1rem 1.3rem;
  }
}
</style>
