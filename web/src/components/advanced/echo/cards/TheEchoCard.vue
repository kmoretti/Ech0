<!-- SPDX-License-Identifier: AGPL-3.0-or-later -->
<!-- Copyright (C) 2025-2026 lin-snow -->
<template>
  <article
    class="desk-note group"
    :class="[
      noteStyleClass,
      fastenerClass,
      {
        'desk-note--wide': wide,
        'desk-note--dropcap': dropCap,
        'desk-note--private': echo.private,
      },
    ]"
    :style="noteInlineStyle"
  >
    <span class="desk-note__fastener" aria-hidden="true"></span>

    <div class="desk-note__sheet">
      <header class="desk-note__head">
        <span class="desk-note__serial">No.{{ letterNo || '01' }}</span>
        <span class="desk-note__time">{{ timeLabel }}</span>
        <span class="desk-note__dot" aria-hidden="true"></span>
        <span class="desk-note__words">{{ t('starJournal.words', { count: wordCount }) }}</span>
        <span v-if="props.echo.private" class="desk-note__private">
          {{ t('echoCard.privateStatus') }}
        </span>

        <div v-if="userStore.isLogin" class="desk-note__menu-wrap">
          <button
            ref="menuTriggerRef"
            type="button"
            :aria-label="t('echoCard.moreActions')"
            :aria-expanded="isMenuOpen"
            aria-haspopup="menu"
            class="desk-note__menu-btn"
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
                class="desk-note__menu"
              >
                <div v-if="props.echo.private" class="desk-note__menu-note">
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

      <div class="desk-note__body">
        <template v-if="isContentLeadingEcho(props.echo)">
          <div class="desk-note__prose">
            <TheMdPreview :content="props.echo.content" />
          </div>
          <div class="desk-note__media" :class="{ 'desk-note__media--av': isAvEcho }">
            <TheMediaPlayer
              :echo="props.echo"
              :layout="props.echo.layout"
              :priority="props.index === 0"
            />
          </div>
        </template>

        <template v-else>
          <div class="desk-note__media" :class="{ 'desk-note__media--av': isAvEcho }">
            <TheMediaPlayer
              :echo="props.echo"
              :layout="props.echo.layout"
              :priority="props.index === 0"
            />
          </div>
          <div class="desk-note__prose">
            <TheMdPreview :content="props.echo.content" />
          </div>
        </template>

        <div v-if="props.echo.extension" class="desk-note__extension">
          <TheExtensionRenderer :echo="props.echo" />
        </div>
      </div>

      <footer class="desk-note__foot">
        <ul v-if="tags.length" class="desk-note__tags">
          <li v-for="tag in tags" :key="tag.id" class="desk-note__tag">
            <span aria-hidden="true">#</span>{{ tag.name }}
          </li>
        </ul>
        <span v-else class="desk-note__foot-ornament" aria-hidden="true">· ·</span>

        <button type="button" class="desk-note__open" @click="handleExpandEcho(echo.id)">
          <span>{{ t('echoCard.openDetail') }}</span>
          <Open class="desk-note__open-icon" />
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

type NoteStyle = 'plain' | 'ruled' | 'grid' | 'kraft' | 'trace'
type Fastener = 'tape' | 'pin' | 'staple'

const props = defineProps<{
  echo: Echo
  index?: number
  featured?: boolean
  dropCap?: boolean
  letterNo?: string
  noteStyle?: NoteStyle
  fastener?: Fastener
  tilt?: number
  offset?: number
  wide?: boolean
}>()

const noteStyleClass = computed(() => `desk-note--${props.noteStyle ?? 'plain'}`)
const fastenerClass = computed(() => `desk-note--${props.fastener ?? 'tape'}`)
const noteInlineStyle = computed(() => ({
  '--note-tilt': `${props.tilt ?? 0}deg`,
  '--note-offset': `${props.offset ?? 0}px`,
}))

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
.desk-note {
  --note-ink: var(--sj-ink, #292622);
  --note-ink-2: var(--sj-ink-2, #605b55);
  --note-ink-3: var(--sj-ink-3, #928c84);
  --note-line: var(--sj-line, #d9d3ca);
  --note-line-strong: var(--sj-line-strong, #c3bcb2);
  --note-paper: var(--sj-paper, #fbfaf7);

  position: relative;
  grid-row: span var(--note-rows, 1);
  width: 100%;
  min-width: 0;
  transform: rotate(var(--note-tilt, 0deg)) translateY(var(--note-offset, 0));
  transition:
    transform 480ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 320ms ease;
  animation: note-settle 720ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

.desk-note--wide {
  grid-column: 1 / -1;
}

.desk-note__fastener {
  position: absolute;
  z-index: 2;
  top: -0.52rem;
  left: 50%;
  pointer-events: none;
}

.desk-note--tape .desk-note__fastener {
  width: 4.6rem;
  height: 1.2rem;
  transform: translateX(-50%) rotate(-1.8deg);
  background:
    repeating-linear-gradient(
      90deg,
      color-mix(in srgb, var(--note-ink) 7%, transparent) 0 2px,
      transparent 2px 5px
    ),
    color-mix(in srgb, #fff 55%, var(--note-line) 45%);
  opacity: 0.72;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--note-ink) 8%, transparent);
  clip-path: polygon(2% 6%, 98% 0, 100% 92%, 0 100%);
}

.desk-note--pin .desk-note__fastener {
  width: 0.62rem;
  height: 0.62rem;
  transform: translate(-50%, 0);
  border-radius: 50%;
  background: radial-gradient(circle at 34% 28%, #fff 0 18%, #a8a29a 42%, #625d57 100%);
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--note-ink) 30%, transparent),
    0 4px 7px -3px color-mix(in srgb, var(--note-ink) 35%, transparent);
}

.desk-note--staple .desk-note__fastener {
  top: 0.32rem;
  left: 0.55rem;
  width: 0.7rem;
  height: 0.42rem;
  transform: rotate(-28deg);
  border-top: 1.5px solid color-mix(in srgb, var(--note-ink) 45%, transparent);
  border-bottom: 1.5px solid color-mix(in srgb, var(--note-ink) 30%, transparent);
  opacity: 0.55;
}

.desk-note__sheet {
  position: relative;
  min-width: 0;
  padding: 1.05rem 1.1rem 0.82rem;
  color: var(--note-ink);
  background-color: var(--note-paper);
  border: 1px solid var(--note-line);
  border-radius: 2px;
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--note-ink) 4%, transparent),
    0 1px 2px color-mix(in srgb, var(--note-ink) 5%, transparent),
    0 16px 28px -24px color-mix(in srgb, var(--note-ink) 55%, transparent);
  overflow: hidden;
  transition:
    border-color 300ms ease,
    box-shadow 480ms cubic-bezier(0.16, 1, 0.3, 1);
}

.desk-note__sheet::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.045;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
}

/* Paper stocks */
.desk-note--ruled .desk-note__sheet {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0 1.62rem,
    color-mix(in srgb, var(--note-ink) 8%, transparent) 1.62rem calc(1.62rem + 1px)
  );
  background-position: 0 3.25rem;
}

.desk-note--grid .desk-note__sheet {
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0 1.3rem,
      color-mix(in srgb, var(--note-ink) 7%, transparent) 1.3rem calc(1.3rem + 1px)
    ),
    repeating-linear-gradient(
      to right,
      transparent 0 1.3rem,
      color-mix(in srgb, var(--note-ink) 7%, transparent) 1.3rem calc(1.3rem + 1px)
    );
  background-position: 0 3.25rem;
}

.desk-note--kraft .desk-note__sheet {
  background-color: var(--sj-kraft, #e7e1d7);
}

.desk-note--trace .desk-note__sheet {
  background-color: color-mix(in srgb, var(--note-paper) 76%, var(--sj-canvas, #ece9e3) 24%);
}

.desk-note--trace .desk-note__sheet::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    118deg,
    transparent 0 42%,
    color-mix(in srgb, #fff 55%, transparent) 46%,
    transparent 58%
  );
  opacity: 0.35;
}

.desk-note__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.42rem;
  min-height: 1.25rem;
  margin-bottom: 0.55rem;
  font-family: var(--font-family-display);
  font-size: 0.64rem;
  letter-spacing: 0.07em;
  color: var(--note-ink-3);
}

.desk-note__serial {
  padding: 0.02rem 0.28rem;
  border: 1px solid var(--note-line);
  color: var(--note-ink-2);
  font-size: 0.58rem;
  letter-spacing: 0.1em;
}

.desk-note__time {
  color: var(--note-ink-2);
  font-variant-numeric: tabular-nums;
}

.desk-note__dot {
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: var(--note-line-strong);
}

.desk-note__private {
  padding: 0.02rem 0.3rem;
  border: 1px solid var(--note-line-strong);
  color: var(--note-ink-2);
  font-size: 0.56rem;
  letter-spacing: 0.1em;
}

.desk-note__menu-wrap {
  margin-left: auto;
  flex: none;
}

.desk-note__menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 50%;
  color: var(--note-ink-3);
  border: 1px solid transparent;
  transition:
    color 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;
}

.desk-note__menu-btn:hover,
.desk-note__menu-btn:focus-visible {
  color: var(--note-ink);
  border-color: var(--note-line-strong);
  background: color-mix(in srgb, var(--note-paper) 70%, var(--note-line) 30%);
  outline: none;
}

.desk-note__body {
  min-width: 0;
}

.desk-note__prose {
  min-width: 0;
  color: var(--note-ink);
}

.desk-note__prose :deep(.echo-markdown) {
  font-size: 0.9rem;
  line-height: 1.78;
}

.desk-note__prose :deep(.echo-markdown > div > p) {
  margin-block: 0.32em;
}

.desk-note__media {
  margin-bottom: 0.65rem;
}

.desk-note__media--av {
  margin-bottom: 0.7rem;
}

.desk-note__media:empty {
  display: none;
}

.desk-note__extension {
  margin-top: 0.6rem;
}

.desk-note__extension :deep(.extension-card-shell) {
  border-color: var(--note-line);
  border-radius: 1px;
  background: color-mix(in srgb, var(--note-paper) 82%, var(--sj-canvas, #ece9e3) 18%);
  box-shadow: none;
}

.desk-note__extension :deep(.extension-card-shell__header) {
  border-bottom: 1px dashed var(--note-line);
  background: transparent;
  color: var(--note-ink-3);
}

.desk-note__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  margin-top: 0.65rem;
  padding-top: 0.5rem;
  border-top: 1px dashed color-mix(in srgb, var(--note-line-strong) 75%, transparent);
}

.desk-note__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.desk-note__tag {
  padding: 0.04rem 0.36rem;
  border: 1px dashed var(--note-line-strong);
  border-radius: 1px;
  font-size: 0.63rem;
  letter-spacing: 0.03em;
  color: var(--note-ink-2);
}

.desk-note__tag > span {
  margin-right: 0.08rem;
  color: var(--note-ink-3);
  font-family: var(--font-family-display);
}

.desk-note__foot-ornament {
  font-size: 0.6rem;
  letter-spacing: 0.28em;
  color: var(--note-ink-3);
}

.desk-note__open {
  display: inline-flex;
  align-items: center;
  gap: 0.24rem;
  white-space: nowrap;
  font-family: var(--font-family-display);
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  color: var(--note-ink-3);
  transition: color 180ms ease;
}

.desk-note__open:hover,
.desk-note__open:focus-visible {
  color: var(--note-ink);
  outline: none;
}

.desk-note__open-icon {
  width: 0.68rem;
  height: 0.68rem;
  transition: transform 200ms ease;
}

.desk-note__open:hover .desk-note__open-icon {
  transform: translate(1px, -1px);
}

/* Wide opener: a little more air, a faint quotation mark, no colour. */
.desk-note--wide .desk-note__sheet {
  padding: 1.2rem 1.35rem 0.9rem;
}

.desk-note--wide .desk-note__sheet::before {
  content: '“';
  position: absolute;
  top: -0.4rem;
  right: 0.8rem;
  font-family: var(--font-family-display);
  font-size: 4.2rem;
  line-height: 1;
  color: color-mix(in srgb, var(--note-ink) 8%, transparent);
  pointer-events: none;
}

.desk-note--wide .desk-note__prose :deep(.echo-markdown) {
  font-size: 0.94rem;
}

.desk-note--dropcap .desk-note__prose :deep(.echo-markdown > div > p:first-child)::first-letter {
  float: left;
  margin: 0.04em 0.1em 0 0;
  font-family: var(--font-family-display);
  font-size: 2.7em;
  font-weight: 600;
  line-height: 0.82;
  color: var(--note-ink);
}

@media (hover: hover) {
  .desk-note:hover {
    z-index: 3;
    will-change: transform;
    transform: rotate(0deg) translateY(calc(var(--note-offset, 0px) - 6px)) scale(1.004);
  }

  .desk-note:hover .desk-note__sheet {
    border-color: var(--note-line-strong);
    box-shadow:
      0 1px 0 color-mix(in srgb, var(--note-ink) 5%, transparent),
      0 2px 5px color-mix(in srgb, var(--note-ink) 8%, transparent),
      0 28px 42px -28px color-mix(in srgb, var(--note-ink) 55%, transparent);
  }

  .desk-note--tape:hover .desk-note__fastener {
    transform: translateX(-50%) translateY(-1px) rotate(-1.8deg);
  }

  .desk-note--pin:hover .desk-note__fastener {
    transform: translate(-50%, -1px);
  }

  .desk-note--staple:hover .desk-note__fastener {
    transform: translateY(-1px) rotate(-28deg);
  }

  .desk-note__fastener {
    transition: transform 480ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.desk-note__menu {
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

.desk-note__menu-note {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem 0.375rem;
  color: var(--color-text-muted);
}

.desk-note__menu-note span {
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

@keyframes note-settle {
  from {
    opacity: 0;
    filter: blur(2px);
    transform: rotate(calc(var(--note-tilt, 0deg) * 1.8))
      translateY(calc(var(--note-offset, 0px) + 12px));
  }

  to {
    opacity: 1;
    filter: blur(0);
    transform: rotate(var(--note-tilt, 0deg)) translateY(var(--note-offset, 0));
  }
}

@media (prefers-reduced-motion: reduce) {
  .desk-note {
    animation: none;
    transition: none;
  }
}

@media (width <= 640px) {
  .desk-note {
    transform: rotate(calc(var(--note-tilt, 0deg) * 0.45))
      translateY(calc(var(--note-offset, 0px) * 0.4));
  }

  .desk-note__sheet {
    padding: 0.85rem 0.9rem 0.72rem;
  }

  .desk-note--wide .desk-note__sheet {
    padding: 0.95rem 0.95rem 0.75rem;
  }

  .desk-note__head {
    font-size: 0.6rem;
  }
}
</style>
