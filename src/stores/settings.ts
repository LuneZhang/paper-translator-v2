import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ThemeMode, UserSettings } from '@/types/settings'
import type { TranslationEngine } from '@/types/translation'

const SETTINGS_KEY = 'paper-translator-settings'

const defaultSettings: UserSettings = {
  apiKey: '',
  engine: 'gemini-flash',
  theme: 'system',
  fontSize: 16,
  syncScroll: true,
  setupCompleted: false,
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettings>(loadSettings())

  function loadSettings(): UserSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) }
      }
    } catch {
      // ignore parse errors
    }
    return { ...defaultSettings }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings.value))
  }

  // Computed
  const apiKey = computed(() => settings.value.apiKey)
  const engine = computed(() => settings.value.engine)
  const theme = computed(() => settings.value.theme)
  const fontSize = computed(() => settings.value.fontSize)
  const syncScroll = computed(() => settings.value.syncScroll)
  const setupCompleted = computed(() => settings.value.setupCompleted)
  const hasApiKey = computed(() => settings.value.apiKey.length > 0)

  // Actions
  function setApiKey(key: string) {
    settings.value.apiKey = key
    saveSettings()
  }

  function setEngine(engine: TranslationEngine) {
    settings.value.engine = engine
    saveSettings()
  }

  function setTheme(theme: ThemeMode) {
    settings.value.theme = theme
    saveSettings()
  }

  function setFontSize(size: number) {
    settings.value.fontSize = Math.max(14, Math.min(24, size))
    saveSettings()
  }

  function setSyncScroll(enabled: boolean) {
    settings.value.syncScroll = enabled
    saveSettings()
  }

  function completeSetup() {
    settings.value.setupCompleted = true
    saveSettings()
  }

  return {
    settings,
    apiKey,
    engine,
    theme,
    fontSize,
    syncScroll,
    setupCompleted,
    hasApiKey,
    setApiKey,
    setEngine,
    setTheme,
    setFontSize,
    setSyncScroll,
    completeSetup,
  }
})
