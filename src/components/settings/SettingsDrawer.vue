<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useTheme } from '@/composables/useTheme'
import { testConnection } from '@/services/api'
import { maskApiKey } from '@/utils/format'
import EngineSelector from './EngineSelector.vue'
import QuotaDisplay from './QuotaDisplay.vue'
import FontSizeControl from './FontSizeControl.vue'
import type { ThemeMode } from '@/types/settings'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const settingsStore = useSettingsStore()
const { setTheme } = useTheme()

// API Key editing state
const editingKey = ref(false)
const newApiKey = ref('')
const keyTestStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const keyTestMessage = ref('')

function startEditKey() {
  editingKey.value = true
  newApiKey.value = ''
  keyTestStatus.value = 'idle'
  keyTestMessage.value = ''
}

function cancelEditKey() {
  editingKey.value = false
  newApiKey.value = ''
  keyTestStatus.value = 'idle'
}

function saveApiKey() {
  if (newApiKey.value.trim()) {
    settingsStore.setApiKey(newApiKey.value.trim())
  }
  editingKey.value = false
  newApiKey.value = ''
}

async function handleTestConnection() {
  const key = editingKey.value ? newApiKey.value.trim() : settingsStore.apiKey
  if (!key) return

  keyTestStatus.value = 'loading'
  keyTestMessage.value = ''
  try {
    const result = await testConnection(key, settingsStore.engine)
    if (result.success) {
      keyTestStatus.value = 'success'
      keyTestMessage.value = '连接成功'
    } else {
      keyTestStatus.value = 'error'
      keyTestMessage.value = result.message || '连接失败'
    }
  } catch (e: any) {
    keyTestStatus.value = 'error'
    keyTestMessage.value = e.message || '连接测试出错'
  }
}

function handleThemeChange(mode: ThemeMode) {
  setTheme(mode)
}

function handleBackdropClick() {
  emit('close')
}

// Reset editing state when drawer closes
watch(() => props.show, (val) => {
  if (!val) {
    editingKey.value = false
    newApiKey.value = ''
    keyTestStatus.value = 'idle'
  }
})

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色' },
  { value: 'system', label: '跟随系统' },
]
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="props.show"
        class="fixed inset-0 z-30"
        style="background: var(--color-overlay)"
        @click="handleBackdropClick"
      />
    </Transition>

    <!-- Drawer -->
    <Transition name="slide-right">
      <div
        v-if="props.show"
        class="fixed top-0 right-0 bottom-0 z-30 flex flex-col"
        style="
          width: 380px;
          max-width: 100vw;
          background: var(--color-bg-primary);
          border-left: 1px solid var(--color-border);
          box-shadow: var(--shadow-xl);
        "
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style="border-bottom: 1px solid var(--color-border)"
        >
          <h2 class="text-base font-semibold" style="color: var(--color-text-primary)">
            设置
          </h2>
          <button
            class="p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            style="color: var(--color-text-secondary)"
            @click="emit('close')"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto">
          <!-- Section 1: Translation Engine -->
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--color-border)">
            <h3 class="text-sm font-medium mb-3" style="color: var(--color-text-secondary)">
              翻译引擎
            </h3>
            <EngineSelector />
          </div>

          <!-- Section 2: API Key -->
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--color-border)">
            <h3 class="text-sm font-medium mb-3" style="color: var(--color-text-secondary)">
              API Key
            </h3>

            <template v-if="!editingKey">
              <div class="flex items-center gap-2 mb-3">
                <span
                  class="flex-1 text-sm font-mono truncate"
                  style="color: var(--color-text-primary)"
                >
                  {{ settingsStore.hasApiKey ? maskApiKey(settingsStore.apiKey) : '未设置' }}
                </span>
                <button
                  class="text-xs px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                  style="
                    color: var(--color-accent);
                    background: var(--color-accent-light);
                  "
                  @click="startEditKey"
                >
                  修改
                </button>
              </div>
            </template>

            <template v-else>
              <div class="mb-3">
                <input
                  v-model="newApiKey"
                  type="password"
                  placeholder="输入新的 API Key..."
                  class="w-full px-3 py-2 text-sm rounded-lg outline-none mb-2"
                  style="
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-border);
                    color: var(--color-text-primary);
                  "
                  @focus="($event.target as HTMLElement).style.borderColor = 'var(--color-accent)'"
                  @blur="($event.target as HTMLElement).style.borderColor = 'var(--color-border)'"
                />
                <div class="flex gap-2">
                  <button
                    class="text-xs px-3 py-1.5 rounded-md text-white transition-colors cursor-pointer"
                    :style="{
                      background: newApiKey.trim() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                      color: newApiKey.trim() ? 'white' : 'var(--color-text-tertiary)',
                      cursor: newApiKey.trim() ? 'pointer' : 'not-allowed',
                    }"
                    :disabled="!newApiKey.trim()"
                    @click="saveApiKey"
                  >
                    保存
                  </button>
                  <button
                    class="text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                    style="
                      background: var(--color-bg-secondary);
                      color: var(--color-text-secondary);
                      border: 1px solid var(--color-border);
                    "
                    @click="cancelEditKey"
                  >
                    取消
                  </button>
                </div>
              </div>
            </template>

            <!-- Test connection -->
            <div class="flex items-center gap-2">
              <button
                class="text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                :disabled="keyTestStatus === 'loading' || (!settingsStore.hasApiKey && !newApiKey.trim())"
                :style="{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  opacity: (!settingsStore.hasApiKey && !newApiKey.trim()) ? '0.5' : '1',
                  cursor: (!settingsStore.hasApiKey && !newApiKey.trim()) ? 'not-allowed' : 'pointer',
                }"
                @click="handleTestConnection"
              >
                <span v-if="keyTestStatus === 'loading'" class="flex items-center gap-1.5">
                  <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="opacity-75" />
                  </svg>
                  测试中
                </span>
                <span v-else>测试连接</span>
              </button>

              <span
                v-if="keyTestStatus === 'success'"
                class="text-xs flex items-center gap-1"
                style="color: var(--color-success)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {{ keyTestMessage }}
              </span>
              <span
                v-if="keyTestStatus === 'error'"
                class="text-xs flex items-center gap-1"
                style="color: var(--color-error)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                {{ keyTestMessage }}
              </span>
            </div>
          </div>

          <!-- Section 3: Quota -->
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--color-border)">
            <h3 class="text-sm font-medium mb-3" style="color: var(--color-text-secondary)">
              配额状态
            </h3>
            <QuotaDisplay />
          </div>

          <!-- Section 4: Display Settings -->
          <div class="px-5 py-4" style="border-bottom: 1px solid var(--color-border)">
            <h3 class="text-sm font-medium mb-3" style="color: var(--color-text-secondary)">
              显示设置
            </h3>

            <!-- Font size -->
            <div class="mb-4">
              <FontSizeControl />
            </div>

            <!-- Theme selector -->
            <div class="mb-4">
              <span class="text-sm mb-2 block" style="color: var(--color-text-secondary)">
                主题
              </span>
              <div
                class="inline-flex rounded-lg overflow-hidden"
                style="border: 1px solid var(--color-border)"
              >
                <button
                  v-for="option in themeOptions"
                  :key="option.value"
                  class="px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                  :style="{
                    background: settingsStore.theme === option.value ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                    color: settingsStore.theme === option.value ? 'white' : 'var(--color-text-secondary)',
                    borderRight: option.value !== 'system' ? '1px solid var(--color-border)' : 'none',
                  }"
                  @click="handleThemeChange(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- Sync scroll toggle -->
            <div class="flex items-center justify-between">
              <span class="text-sm" style="color: var(--color-text-secondary)">
                同步滚动
              </span>
              <button
                class="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
                :style="{
                  background: settingsStore.syncScroll ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                }"
                role="switch"
                :aria-checked="settingsStore.syncScroll"
                @click="settingsStore.setSyncScroll(!settingsStore.syncScroll)"
              >
                <span
                  class="absolute top-0.5 w-4 h-4 rounded-full transition-transform shadow-sm"
                  :style="{
                    background: 'white',
                    transform: settingsStore.syncScroll ? 'translateX(22px)' : 'translateX(2px)',
                  }"
                />
              </button>
            </div>
          </div>

          <!-- Section 5: About -->
          <div class="px-5 py-4">
            <h3 class="text-sm font-medium mb-3" style="color: var(--color-text-secondary)">
              关于
            </h3>
            <p class="text-sm" style="color: var(--color-text-primary)">
              Paper Translator
              <span class="text-xs ml-1" style="color: var(--color-text-tertiary)">v1.0.0</span>
            </p>
            <p class="text-xs mt-1" style="color: var(--color-text-tertiary)">
              智能学术论文翻译器
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Backdrop fade */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Drawer slide from right */
.slide-right-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-leave-active {
  transition: transform 0.2s ease-in;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
