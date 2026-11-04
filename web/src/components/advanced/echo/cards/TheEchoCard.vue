<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <article
    class="star-letter group"
    :class="{
      'star-letter--featured': featured,
      'star-letter--dropcap': dropCap,
      'star-letter--private': echo.private,
    }"
  >
    <div class="star-letter__index" aria-hidden="true">
      <span class="star-letter__index-num">{{ letterNo || '01' }}</span>
      <span class="star-letter__index-line"></span>
    </div>

    <div class="star-letter__paper">
      <span class="star-letter__fold" aria-hidden="true"></span>

      <header class="star-letter__head">
        <div class="star-letter__stamp">
          <span class="star-letter__time">{{ timeLabel }}</span>
          <span class="star-letter__sep" aria-hidden="true"></span>
          <span class="star-letter__words">{{ t('starJournal.words', { count: wordCount }) }}</span>
          <span v-if="props.echo.private" class="star-letter__private">
            <Lock class="star-letter__private-icon" />
            {{ t('echoCard.privateStatus') }}
          </span>
        </div>

        <div v-if="userStore.isLogin" class="star-letter__menu-wrap">
          <button
            ref="menuTriggerRef"
            type="button"
            :aria-label="t('echoCard.moreActions')"
            :aria-expanded="isMenuOpen"
            aria-haspopup="menu"
            class="star-letter__menu-btn"
            @click.stop="toggleMenu"
          >
            <More class="w-4 h-4" />
          </button>

          <Teleport to="body">
            <transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="isMenuOpen"
                ref="menuPanelRef"
                :style="menuPanelStyle"
                class="star-letter__menu"
              >
                <div v-if="props.echo.private" class="star-letter__menu-note">
                  <Lock class="w-3 h-3" />
                  <span>{{ t('echoCard.privateStatus') }}</span>
                </div>

                <button
                  type="button"
                  class="menu-row"
                  @click="
                    () => {
                      closeMenu()
                      handleUpdateEcho()
                    }
                  "
                >
                  <EditEcho class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ t('echoCard.update') }}</span>
                </button>
                <button
                  type="button"
                  class="menu-row menu-row--danger"
                  @click="
                    () => {
                      closeMenu()
                      handleDeleteEcho(props.echo.id)
                    }
                  "
                >
                  <Roll class="w-3.5 h-3.5 shrink-0" />
                  <span>{{ t('echoCard.delete') }}</span>
                </button>
              </div>
            </transition>
          </Teleport>
        </div>
      </header>

      <div class="star-letter__body">
        <template v-if="isContentLeadingEcho(props.echo)">
          <div class="star-letter__prose">
            <TheMdPreview :content="props.echo.content" />
          </div>
          <div class="star-letter__media" :class="{ 'star-letter__media--av': isAvEcho }">
            <TheMediaPlayer
              :echo="props.echo"
              :layout="props.echo.layout"
              :priority="props.index === 0"
            />
          </div>
        </template>

        <template v-else>
          <div class="star-letter__media" :class="{ 'star-letter__media--av': isAvEcho }">
            <TheMediaPlayer
              :echo="props.echo"
              :layout="props.echo.layout"
              :priority="props.index === 0"
            />
          </div>
          <div class="star-letter__prose">
            <TheMdPreview :content="props.echo.content" />
          </div>
        </template>

        <div v-if="props.echo.extension" class="star-letter__extension">
          <TheExtensionRenderer :echo="props.echo" />
        </div>
      </div>

      <footer class="star-letter__foot">
        <ul v-if="tags.length" class="star-letter__tags">
          <li v-for="tag in tags" :key="tag.id" class="star-letter__tag">
            <span aria-hidden="true">#</span>{{ tag.name }}
          </li>
        </ul>
        <span v-else class="star-letter__foot-ornament" aria-hidden="true">✦</span>

        <button type="button" class="star-letter__open" @click="handleExpandEcho(echo.id)">
          <span>{{ t('echoCard.openDetail') }}</span>
          <Open class="star-letter__open-icon" />
        </button>
      </footer>
    </div>
  </article>
</template>

<script lang="ts">
import { ref } from 'vue'

const activeMenuId = ref<string | null>(null)
</script>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, watch } from 'vue'
import { fetchDeleteEcho, fetchGetEchoById } from '@/service/api'
import { theToast } from '@/utils/toast'
import { useUserStore, useEchoStore, useEditorStore } from '@/stores'
import { TheMdPreview } from '@/components/advanced/md'
import Roll from '@/components/icons/roll.vue'
import Lock from '@/components/icons/lock.vue'
import More from '@/components/icons/more.vue'
import EditEcho from '@/components/icons/editecho.vue'
import Open from '@/components/icons/open.vue'
import { useRouter } from 'vue-router'
import { countWords, getEchoFilesBy, isContentLeadingEcho } from '@/utils/echo'
import { timeValueToMs } from '@/utils/timeValue'
import { useBaseDialog } from '@/composables/useBaseDialog'
import { useI18n } from 'vue-i18n'

const TheMediaPlayer = defineAsyncComponent(
  () => import('@/components/advanced/media/TheMediaPlayer.vue'),
)
const TheExtensionRenderer = defineAsyncComponent(
  () => import('@/components/advanced/extension/TheExtensionRenderer.vue'),
)

const { openConfirm } = useBaseDialog()
const { t, locale } = useI18n()

const emit = defineEmits(['refresh'])

type Echo = App.Api.Ech0.Echo

const props = defineProps<{
  echo: Echo
  index?: number
  featured?: boolean
  dropCap?: boolean
  letterNo?: string
}>()

const isAvEcho = computed(
  () => getEchoFilesBy(props.echo, { categories: ['audio', 'video'] }).length > 0,
)

const tags = computed(() => props.echo.tags ?? [])
const wordCount = computed(() => countWords(props.echo.content))

const timeLabel = computed(() => {
  const ms = timeValueToMs(props.echo.created_at)
  if (ms <= 0) return ''
  return new Intl.DateTimeFormat(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms))
})

const userStore = useUserStore()

const echoStore = useEchoStore()
const editorStore = useEditorStore()
const router = useRouter()

const handleDeleteEcho = (echoId: string) => {
  openConfirm({
    title: String(t('echoCard.deleteConfirmTitle')),
    description: String(t('echoCard.deleteConfirmDesc')),
    onConfirm: () => {
      fetchDeleteEcho(echoId).then(() => {
        theToast.success(String(t('echoCard.deleteSuccess')))
        emit('refresh')
      })
    },
  })
}

const handleUpdateEcho = async () => {
  if (editorStore.isUpdateMode) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    theToast.warning(String(t('echoCard.exitUpdateModeFirst')))
    return
  }

  const res = await fetchGetEchoById(String(props.echo.id))
  if (res.code === 1 && res.data) {
    echoStore.echoToUpdate = res.data
  } else {
    echoStore.echoToUpdate = props.echo
  }

  editorStore.isUpdateMode = true
  await router.push({
    name: 'home',
    query: { ...router.currentRoute.value.query, tab: 'publish' },
  })
}

const handleExpandEcho = (echoId: string) => {
  router.push({
    name: 'echo',
    params: { echoId: echoId },
  })
}

const isMenuOpen = computed(() => activeMenuId.value === props.echo.id)
const menuTriggerRef = ref<HTMLElement | null>(null)
const menuPanelRef = ref<HTMLElement | null>(null)
const menuPanelStyle = ref<Record<string, string>>({})

const MENU_GAP = 8

const updateMenuPosition = () => {
  if (!isMenuOpen.value || !menuTriggerRef.value) return
  const rect = menuTriggerRef.value.getBoundingClientRect()
  const viewportRight = window.innerWidth
  const right = Math.max(MENU_GAP, viewportRight - rect.right)
  menuPanelStyle.value = {
    top: `${rect.bottom + MENU_GAP}px`,
    right: `${right}px`,
  }
}

const closeMenu = () => {
  if (isMenuOpen.value) activeMenuId.value = null
}

const toggleMenu = () => {
  activeMenuId.value = isMenuOpen.value ? null : props.echo.id
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target) return
  if (menuPanelRef.value?.contains(target) || menuTriggerRef.value?.contains(target)) return
  closeMenu()
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape') closeMenu()
}

const SCROLL_LISTENER_OPTIONS: AddEventListenerOptions = { passive: true, capture: true }

const bindGlobalListeners = () => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', updateMenuPosition, { passive: true })
  window.addEventListener('scroll', updateMenuPosition, SCROLL_LISTENER_OPTIONS)
}

const unbindGlobalListeners = () => {
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', updateMenuPosition)
  window.removeEventListener('scroll', updateMenuPosition, SCROLL_LISTENER_OPTIONS)
}

watch(isMenuOpen, async (open) => {
  if (open) {
    await nextTick()
    updateMenuPosition()
    bindGlobalListeners()
  } else {
    unbindGlobalListeners()
  }
})

onBeforeUnmount(() => {
  if (isMenuOpen.value) {
    activeMenuId.value = null
    unbindGlobalListeners()
  }
})
</script>

<style scoped lang="css">
.star-letter {
  --sl-ink: var(--sj-ink, #2f251d);
  --sl-ink-soft: var(--sj-ink-2, #6f6357);
  --sl-ink-faint: var(--sj-ink-3, #9a8d7e);
  --sl-line: var(--sj-line, #e6ddcf);
  --sl-line-strong: var(--sj-line-strong, #d5c7b4);
  --sl-paper: var(--sj-paper, #fffdf7);
  --sl-canvas: var(--sj-canvas, #f7f3ea);
  --sl-accent: var(--sj-accent, #b84200);
  --sl-gold: var(--sj-gold, #b08a3e);

  position: relative;
  display: grid;
  grid-template-columns: 2.1rem minmax(0, 1fr);
  gap: 0.55rem;
  width: 100%;
  min-width: 0;
  animation: ink-settle 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.star-letter__index {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding-top: 0.9rem;
  color: var(--sl-ink-faint);
  user-select: none;
}

.star-letter__index-num {
  font-family: var(--font-family-display);
  font-size: 0.66rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
}

.star-letter__index-line {
  width: 1px;
  flex: 1 1 auto;
  min-height: 1.4rem;
  background: linear-gradient(
    to bottom,
    var(--sl-line-strong),
    color-mix(in srgb, var(--sl-line) 25%, transparent)
  );
}

.star-letter__paper {
  position: relative;
  min-width: 0;
  padding: 0.95rem 1.1rem 0.8rem;
  background:
    radial-gradient(
      120% 90% at 100% 0%,
      color-mix(in srgb, var(--sl-gold) 6%, transparent),
      transparent 55%
    ),
    var(--sl-paper);
  border: 1px solid var(--sl-line);
  border-radius: 3px 15px 3px 3px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--sl-ink) 4%, transparent),
    0 14px 30px -26px color-mix(in srgb, var(--sl-ink) 55%, transparent);
  transition:
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 260ms ease,
    border-color 260ms ease;
}

.star-letter__paper::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

.star-letter__fold {
  position: absolute;
  top: -1px;
  right: -1px;
  width: 1.15rem;
  height: 1.15rem;
  background: linear-gradient(
    225deg,
    var(--sl-canvas) 0 47%,
    var(--sl-line-strong) 48% 51%,
    var(--sl-paper) 52%
  );
  border-bottom-left-radius: 2px;
  border-top-right-radius: 14px;
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: top right;
}

.star-letter__fold::after {
  content: '';
  position: absolute;
  right: 0.22rem;
  top: 0.22rem;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--sl-gold);
  opacity: 0;
  transition: opacity 260ms ease;
}

.star-letter__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 1.4rem;
  margin-bottom: 0.55rem;
}

.star-letter__stamp {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  font-family: var(--font-family-display);
  font-size: 0.69rem;
  letter-spacing: 0.04em;
  color: var(--sl-ink-faint);
}

.star-letter__time {
  font-variant-numeric: tabular-nums;
  color: var(--sl-ink-soft);
}

.star-letter__sep {
  width: 0.9rem;
  height: 1px;
  background: var(--sl-line-strong);
}

.star-letter__words {
  white-space: nowrap;
}

.star-letter__private {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.08rem 0.32rem;
  border: 1px solid color-mix(in srgb, var(--sl-accent) 35%, transparent);
  border-radius: 2px;
  color: var(--sl-accent);
  font-size: 0.6rem;
  letter-spacing: 0.08em;
}

.star-letter__private-icon {
  width: 0.66rem;
  height: 0.66rem;
}

.star-letter__menu-wrap {
  flex: none;
}

.star-letter__menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 50%;
  color: var(--sl-ink-faint);
  border: 1px solid transparent;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.star-letter__menu-btn:hover,
.star-letter__menu-btn:focus-visible {
  color: var(--sl-ink);
  border-color: var(--sl-line-strong);
  background: color-mix(in srgb, var(--sl-paper) 70%, var(--sl-line) 30%);
  outline: none;
}

.star-letter__body {
  min-width: 0;
}

.star-letter__prose {
  min-width: 0;
  color: var(--sl-ink);
}

.star-letter__prose :deep(.echo-markdown) {
  font-size: 0.925rem;
  line-height: 1.78;
}

.star-letter__prose :deep(.echo-markdown > div > p) {
  margin-block: 0.35em;
}

.star-letter__media {
  margin-bottom: 0.7rem;
}

.star-letter__media--av {
  margin-bottom: 0.75rem;
}

.star-letter__media:empty {
  display: none;
}

.star-letter__extension {
  margin-top: 0.6rem;
}

.star-letter__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.7rem;
  padding-top: 0.55rem;
  border-top: 1px dashed color-mix(in srgb, var(--sl-line-strong) 70%, transparent);
}

.star-letter__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.star-letter__tag {
  padding: 0.06rem 0.4rem;
  border: 1px dashed var(--sl-line-strong);
  border-radius: 2px;
  font-size: 0.66rem;
  letter-spacing: 0.03em;
  color: var(--sl-ink-soft);
  background: color-mix(in srgb, var(--sl-paper) 82%, var(--sl-line) 18%);
}

.star-letter__tag > span {
  color: var(--sl-accent);
  margin-right: 0.1rem;
  font-family: var(--font-family-display);
}

.star-letter__foot-ornament {
  font-size: 0.62rem;
  color: color-mix(in srgb, var(--sl-gold) 70%, var(--sl-ink-faint));
  letter-spacing: 0.2em;
}

.star-letter__open {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  white-space: nowrap;
  font-family: var(--font-family-display);
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  color: var(--sl-ink-faint);
  transition: color 180ms ease;
}

.star-letter__open:hover,
.star-letter__open:focus-visible {
  color: var(--sl-accent);
  outline: none;
}

.star-letter__open-icon {
  width: 0.72rem;
  height: 0.72rem;
  transition: transform 200ms ease;
}

.star-letter__open:hover .star-letter__open-icon {
  transform: translate(1px, -1px);
}

/* Featured letter of the day */
.star-letter--featured .star-letter__paper {
  padding-top: 1.15rem;
  background:
    radial-gradient(
      130% 90% at 100% 0%,
      color-mix(in srgb, var(--sl-gold) 10%, transparent),
      transparent 52%
    ),
    var(--sl-paper);
  border-color: color-mix(in srgb, var(--sl-line-strong) 82%, var(--sl-gold) 18%);
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--sl-ink) 5%, transparent),
    0 22px 44px -34px color-mix(in srgb, var(--sl-ink) 65%, transparent);
}

.star-letter--featured .star-letter__paper::before {
  content: '“';
  position: absolute;
  top: -0.35rem;
  right: 0.7rem;
  font-family: var(--font-family-display);
  font-size: 4.2rem;
  line-height: 1;
  color: color-mix(in srgb, var(--sl-accent) 10%, transparent);
  pointer-events: none;
}

.star-letter--dropcap
  .star-letter__prose
  :deep(.echo-markdown > div > p:first-child)::first-letter {
  float: left;
  margin: 0.04em 0.1em 0 0;
  font-family: var(--font-family-display);
  font-size: 2.7em;
  font-weight: 600;
  line-height: 0.82;
  color: var(--sl-accent);
}

@media (hover: hover) {
  .star-letter__paper:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--sl-line-strong) 82%, var(--sl-gold) 18%);
    box-shadow:
      0 1px 0 color-mix(in srgb, var(--sl-ink) 5%, transparent),
      0 20px 36px -28px color-mix(in srgb, var(--sl-ink) 58%, transparent);
  }

  .star-letter__paper:hover .star-letter__fold {
    transform: scale(1.12) rotate(2deg);
  }

  .star-letter__paper:hover .star-letter__fold::after {
    opacity: 1;
  }
}

.star-letter__menu {
  position: fixed;
  z-index: 5000;
  width: 9rem;
  padding: 0.25rem;
  transform-origin: top right;
  border-radius: var(--radius-md);
  background: var(--color-bg-muted);
  box-shadow:
    inset 0 0 0 1px var(--color-border-subtle),
    var(--shadow-md);
}

.star-letter__menu-note {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem 0.375rem;
  color: var(--color-text-muted);
}

.star-letter__menu-note span {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.menu-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  height: 28px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  transition:
    color 150ms ease,
    background-color 150ms ease;
}

.menu-row:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-surface);
}

.menu-row:focus-visible {
  outline: none;
  background: var(--color-bg-surface);
  box-shadow: inset 0 0 0 1.5px var(--color-border-strong);
}

.menu-row--danger:hover {
  color: var(--color-danger);
}

@keyframes ink-settle {
  from {
    opacity: 0;
    filter: blur(3px);
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .star-letter {
    animation: none;
  }
}

@media (width <= 480px) {
  .star-letter {
    grid-template-columns: 1.55rem minmax(0, 1fr);
    gap: 0.4rem;
  }

  .star-letter__paper {
    padding: 0.8rem 0.85rem 0.7rem;
    border-radius: 2px 12px 2px 2px;
  }

  .star-letter__stamp {
    font-size: 0.64rem;
  }
}
</style>
