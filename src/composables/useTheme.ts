import { ref, watch, onMounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import type { ThemeMode } from '@/types/settings'

export function useTheme() {
  const settingsStore = useSettingsStore()
  const isDark = ref(false)

  function getSystemTheme(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  function applyTheme(mode: ThemeMode) {
    if (mode === 'system') {
      isDark.value = getSystemTheme()
    } else {
      isDark.value = mode === 'dark'
    }

    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  function toggleTheme() {
    const modes: ThemeMode[] = ['light', 'dark', 'system']
    const current = settingsStore.theme
    const idx = modes.indexOf(current)
    const next = modes[(idx + 1) % modes.length]!
    settingsStore.setTheme(next)
  }

  function setTheme(mode: ThemeMode) {
    settingsStore.setTheme(mode)
  }

  // Watch for settings changes
  watch(() => settingsStore.theme, (mode) => {
    applyTheme(mode)
  })

  // Watch for system theme changes
  onMounted(() => {
    applyTheme(settingsStore.theme)

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (settingsStore.theme === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handler)
  })

  return {
    isDark,
    toggleTheme,
    setTheme,
  }
}
