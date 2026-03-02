/**
 * Sync-scroll composable.
 *
 * Proportionally maps the scroll position of one pane to the other.
 * Uses a "scrolling source" guard + requestAnimationFrame throttle to
 * prevent infinite feedback loops while keeping the sync smooth.
 */

import { ref, watch, onBeforeUnmount, type Ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export function useSyncScroll(
  leftRef: Ref<HTMLElement | null>,
  rightRef: Ref<HTMLElement | null>,
) {
  const settingsStore = useSettingsStore()
  const enabled = ref(settingsStore.syncScroll)

  // Guard: which side is currently the "source" of the scroll event.
  let scrollSource: 'left' | 'right' | null = null
  let rafId: number | null = null

  // ── handlers ──────────────────────────────────────────

  function syncFromLeft() {
    if (scrollSource === 'right') return
    scrollSource = 'left'

    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      const left = leftRef.value
      const right = rightRef.value
      if (!left || !right) return

      const maxScrollLeft = left.scrollHeight - left.clientHeight
      if (maxScrollLeft <= 0) return

      const ratio = left.scrollTop / maxScrollLeft
      const maxScrollRight = right.scrollHeight - right.clientHeight
      right.scrollTop = ratio * maxScrollRight

      // Release the guard after the browser has applied the scroll
      requestAnimationFrame(() => {
        scrollSource = null
      })
    })
  }

  function syncFromRight() {
    if (scrollSource === 'left') return
    scrollSource = 'right'

    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      const left = leftRef.value
      const right = rightRef.value
      if (!left || !right) return

      const maxScrollRight = right.scrollHeight - right.clientHeight
      if (maxScrollRight <= 0) return

      const ratio = right.scrollTop / maxScrollRight
      const maxScrollLeft = left.scrollHeight - left.clientHeight
      left.scrollTop = ratio * maxScrollLeft

      requestAnimationFrame(() => {
        scrollSource = null
      })
    })
  }

  // ── attach / detach ───────────────────────────────────

  function attach() {
    leftRef.value?.addEventListener('scroll', syncFromLeft, { passive: true })
    rightRef.value?.addEventListener('scroll', syncFromRight, { passive: true })
  }

  function detach() {
    leftRef.value?.removeEventListener('scroll', syncFromLeft)
    rightRef.value?.removeEventListener('scroll', syncFromRight)
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    scrollSource = null
  }

  function toggle() {
    enabled.value = !enabled.value
    settingsStore.setSyncScroll(enabled.value)
  }

  // Re-bind when the elements change or when enabled changes.
  watch(
    [leftRef, rightRef, enabled],
    ([l, r, on], _old, onCleanup) => {
      detach()
      if (on && l && r) attach()
      onCleanup(detach)
    },
    { immediate: true },
  )

  // Keep in sync with settings store (external changes)
  watch(
    () => settingsStore.syncScroll,
    (v) => {
      enabled.value = v
    },
  )

  onBeforeUnmount(detach)

  return {
    enabled,
    toggle,
    cleanup: detach,
  }
}
