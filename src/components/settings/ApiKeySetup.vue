<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { testConnection } from '@/services/api'
import type { TranslationEngine } from '@/types/translation'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  complete: []
}>()

const settingsStore = useSettingsStore()

const currentStep = ref(1)
const apiKey = ref('')
const showApiKey = ref(false)
const selectedEngine = ref<TranslationEngine>('gemini-flash')

// Connection test state
const testStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const testMessage = ref('')

// Allow proceeding if API key is filled in. Connection test is optional
// (may fail due to proxy/network issues but the key could still be valid).
const canProceedStep2 = computed(() => apiKey.value.trim().length > 0)

async function handleTestConnection() {
  if (!apiKey.value.trim()) return
  testStatus.value = 'loading'
  testMessage.value = ''
  try {
    const result = await testConnection(apiKey.value.trim(), selectedEngine.value)
    if (result.success) {
      testStatus.value = 'success'
      testMessage.value = '连接成功'
    } else {
      testStatus.value = 'error'
      testMessage.value = result.message || '连接失败'
    }
  } catch (e: any) {
    testStatus.value = 'error'
    testMessage.value = e.message || '连接测试出错'
  }
}

function goToStep(step: number) {
  currentStep.value = step
}

function handleComplete() {
  settingsStore.setApiKey(apiKey.value.trim())
  settingsStore.setEngine(selectedEngine.value)
  settingsStore.completeSetup()
  emit('complete')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="props.show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        style="background: var(--color-overlay)"
      >
        <div
          class="w-full max-w-lg rounded-2xl overflow-hidden"
          style="
            background: var(--color-bg-primary);
            box-shadow: var(--shadow-xl);
          "
          @click.stop
        >
          <!-- Step content area -->
          <div class="relative overflow-hidden">
            <!-- Step 1: Welcome -->
            <Transition name="slide">
              <div v-if="currentStep === 1" class="p-8 text-center">
                <!-- Inline SVG illustration -->
                <div class="flex justify-center mb-6">
                  <svg
                    width="80"
                    height="80"
                    viewBox="0 0 80 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="12"
                      y="6"
                      width="48"
                      height="62"
                      rx="4"
                      stroke="var(--color-accent)"
                      stroke-width="2.5"
                      fill="var(--color-accent-light)"
                    />
                    <rect
                      x="20"
                      y="12"
                      width="56"
                      height="62"
                      rx="4"
                      stroke="var(--color-accent)"
                      stroke-width="2.5"
                      fill="var(--color-bg-primary)"
                    />
                    <!-- EN lines -->
                    <line x1="28" y1="24" x2="52" y2="24" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round" />
                    <line x1="28" y1="30" x2="48" y2="30" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round" />
                    <line x1="28" y1="36" x2="56" y2="36" stroke="var(--color-text-tertiary)" stroke-width="2" stroke-linecap="round" />
                    <!-- Divider -->
                    <line x1="28" y1="44" x2="68" y2="44" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="3 2" />
                    <!-- CN lines -->
                    <line x1="28" y1="52" x2="58" y2="52" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" />
                    <line x1="28" y1="58" x2="50" y2="58" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" />
                    <line x1="28" y1="64" x2="62" y2="64" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>

                <h1
                  class="text-2xl font-bold mb-3"
                  style="color: var(--color-text-primary)"
                >
                  欢迎使用 Paper Translator
                </h1>
                <p
                  class="text-sm leading-relaxed mb-8"
                  style="color: var(--color-text-secondary)"
                >
                  智能学术论文翻译器，拖入 PDF 即可获得双语对照阅读体验
                </p>

                <button
                  class="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
                  style="background: var(--color-accent)"
                  @mouseenter="($event.target as HTMLElement).style.background = 'var(--color-accent-hover)'"
                  @mouseleave="($event.target as HTMLElement).style.background = 'var(--color-accent)'"
                  @click="goToStep(2)"
                >
                  开始配置
                </button>
              </div>
            </Transition>

            <!-- Step 2: API Key -->
            <Transition name="slide">
              <div v-if="currentStep === 2" class="p-8">
                <h2
                  class="text-xl font-bold mb-2"
                  style="color: var(--color-text-primary)"
                >
                  配置 Gemini API Key
                </h2>
                <p class="text-sm mb-5" style="color: var(--color-text-secondary)">
                  前往
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="underline"
                    style="color: var(--color-accent)"
                  >Google AI Studio</a>
                  获取免费的 API Key
                </p>

                <!-- API Key input -->
                <div class="relative mb-4">
                  <input
                    v-model="apiKey"
                    :type="showApiKey ? 'text' : 'password'"
                    placeholder="输入 API Key..."
                    class="w-full px-3 py-2.5 pr-10 text-sm rounded-lg outline-none transition-colors"
                    style="
                      background: var(--color-bg-secondary);
                      border: 1px solid var(--color-border);
                      color: var(--color-text-primary);
                    "
                    @focus="($event.target as HTMLElement).style.borderColor = 'var(--color-accent)'"
                    @blur="($event.target as HTMLElement).style.borderColor = 'var(--color-border)'"
                  />
                  <button
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                    style="color: var(--color-text-tertiary)"
                    @click="showApiKey = !showApiKey"
                  >
                    <!-- Eye icon -->
                    <svg v-if="!showApiKey" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <!-- Eye-off icon -->
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>

                <!-- Test connection button & status -->
                <div class="flex items-center gap-3 mb-5">
                  <button
                    class="px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer font-medium"
                    :disabled="!apiKey.trim() || testStatus === 'loading'"
                    :style="{
                      background: !apiKey.trim() ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                      border: '1px solid var(--color-border)',
                      color: !apiKey.trim() ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                      opacity: !apiKey.trim() ? '0.6' : '1',
                      cursor: !apiKey.trim() ? 'not-allowed' : 'pointer',
                    }"
                    @click="handleTestConnection"
                  >
                    <span v-if="testStatus === 'loading'" class="flex items-center gap-2">
                      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" class="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="opacity-75" />
                      </svg>
                      测试中...
                    </span>
                    <span v-else>测试连接</span>
                  </button>
                  <span
                    v-if="testStatus === 'success'"
                    class="flex items-center gap-1 text-sm"
                    style="color: var(--color-success)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {{ testMessage }}
                  </span>
                  <span
                    v-if="testStatus === 'error'"
                    class="flex items-center gap-1 text-sm"
                    style="color: var(--color-error)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    {{ testMessage }}
                  </span>
                </div>

                <!-- Model selection -->
                <div class="mb-5">
                  <p class="text-sm font-medium mb-2.5" style="color: var(--color-text-primary)">
                    选择模型
                  </p>
                  <label
                    class="flex items-center gap-3 p-3 rounded-lg mb-2 cursor-pointer transition-colors"
                    :style="{
                      border: '1px solid ' + (selectedEngine === 'gemini-flash' ? 'var(--color-accent)' : 'var(--color-border)'),
                      background: selectedEngine === 'gemini-flash' ? 'var(--color-accent-light)' : 'transparent',
                    }"
                  >
                    <input
                      v-model="selectedEngine"
                      type="radio"
                      value="gemini-flash"
                      class="accent-indigo-500"
                    />
                    <div>
                      <span class="text-sm font-medium" style="color: var(--color-text-primary)">
                        Gemini 2.5 Flash
                      </span>
                      <span
                        class="ml-2 text-xs px-1.5 py-0.5 rounded"
                        style="background: var(--color-accent-light); color: var(--color-accent)"
                      >推荐</span>
                      <p class="text-xs mt-0.5" style="color: var(--color-text-tertiary)">
                        高质量翻译，100次/天
                      </p>
                    </div>
                  </label>
                  <label
                    class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                    :style="{
                      border: '1px solid ' + (selectedEngine === 'gemini-flash-lite' ? 'var(--color-accent)' : 'var(--color-border)'),
                      background: selectedEngine === 'gemini-flash-lite' ? 'var(--color-accent-light)' : 'transparent',
                    }"
                  >
                    <input
                      v-model="selectedEngine"
                      type="radio"
                      value="gemini-flash-lite"
                      class="accent-indigo-500"
                    />
                    <div>
                      <span class="text-sm font-medium" style="color: var(--color-text-primary)">
                        Gemini 2.5 Flash Lite
                      </span>
                      <p class="text-xs mt-0.5" style="color: var(--color-text-tertiary)">
                        快速翻译，1000次/天
                      </p>
                    </div>
                  </label>
                </div>

                <!-- Security note -->
                <p class="text-xs mb-6" style="color: var(--color-text-tertiary)">
                  <svg class="inline -mt-0.5 mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  API Key 仅存储在您的浏览器本地，不会上传到任何服务器
                </p>

                <!-- Navigation -->
                <div class="flex gap-3">
                  <button
                    class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    style="
                      background: var(--color-bg-secondary);
                      color: var(--color-text-secondary);
                      border: 1px solid var(--color-border);
                    "
                    @click="goToStep(1)"
                  >
                    返回
                  </button>
                  <button
                    class="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-colors"
                    :style="{
                      background: canProceedStep2 ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                      color: canProceedStep2 ? 'white' : 'var(--color-text-tertiary)',
                      cursor: canProceedStep2 ? 'pointer' : 'not-allowed',
                    }"
                    :disabled="!canProceedStep2"
                    @click="goToStep(3)"
                  >
                    下一步
                  </button>
                </div>
              </div>
            </Transition>

            <!-- Step 3: Complete -->
            <Transition name="slide">
              <div v-if="currentStep === 3" class="p-8 text-center">
                <!-- Checkmark animation -->
                <div class="flex justify-center mb-6">
                  <div class="checkmark-circle">
                    <svg width="56" height="56" viewBox="0 0 56 56">
                      <circle
                        cx="28"
                        cy="28"
                        r="25"
                        fill="none"
                        stroke="var(--color-success)"
                        stroke-width="2.5"
                        class="checkmark-ring"
                      />
                      <polyline
                        points="17 28 25 36 39 22"
                        fill="none"
                        stroke="var(--color-success)"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="checkmark-check"
                      />
                    </svg>
                  </div>
                </div>

                <h2
                  class="text-xl font-bold mb-2"
                  style="color: var(--color-text-primary)"
                >
                  配置完成
                </h2>
                <p
                  class="text-sm mb-8"
                  style="color: var(--color-text-secondary)"
                >
                  一切就绪，现在可以开始翻译论文了
                </p>

                <button
                  class="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
                  style="background: var(--color-accent)"
                  @mouseenter="($event.target as HTMLElement).style.background = 'var(--color-accent-hover)'"
                  @mouseleave="($event.target as HTMLElement).style.background = 'var(--color-accent)'"
                  @click="handleComplete"
                >
                  开始使用
                </button>
              </div>
            </Transition>
          </div>

          <!-- Step indicators -->
          <div class="flex justify-center gap-2 pb-6">
            <span
              v-for="step in 3"
              :key="step"
              class="w-2 h-2 rounded-full transition-colors"
              :style="{
                background: step === currentStep ? 'var(--color-accent)' : 'var(--color-border)',
              }"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Fade transition for overlay */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Slide transition for steps */
.slide-enter-active {
  transition: all 0.3s ease-out;
}
.slide-leave-active {
  transition: all 0.2s ease-in;
  position: absolute;
  width: 100%;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Checkmark animation */
.checkmark-ring {
  stroke-dasharray: 160;
  stroke-dashoffset: 160;
  animation: checkmark-ring 0.5s ease-out 0.1s forwards;
}

.checkmark-check {
  stroke-dasharray: 40;
  stroke-dashoffset: 40;
  animation: checkmark-check 0.3s ease-out 0.5s forwards;
}

@keyframes checkmark-ring {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes checkmark-check {
  to {
    stroke-dashoffset: 0;
  }
}
</style>
