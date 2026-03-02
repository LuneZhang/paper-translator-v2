<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useDocumentStore } from '@/stores/document'
import { useTranslationStore } from '@/stores/translation'
import { useHistoryStore } from '@/stores/history'
import { useGlossaryStore } from '@/stores/glossary'
import { useTheme } from '@/composables/useTheme'
import { useToast } from '@/composables/useToast'
import { useTranslation } from '@/composables/useTranslation'
import { useKeyboard } from '@/composables/useKeyboard'
import { useSyncScroll } from '@/composables/useSyncScroll'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import SplitPane from '@/components/layout/SplitPane.vue'
import EmptyState from '@/components/layout/EmptyState.vue'
import PdfDropZone from '@/components/pdf/PdfDropZone.vue'
import PdfViewer from '@/components/pdf/PdfViewer.vue'
import PdfPageNav from '@/components/pdf/PdfPageNav.vue'
import TranslationPanel from '@/components/translation/TranslationPanel.vue'
import ApiKeySetup from '@/components/settings/ApiKeySetup.vue'
import SettingsDrawer from '@/components/settings/SettingsDrawer.vue'
import HistoryPanel from '@/components/history/HistoryPanel.vue'
import GlossaryManager from '@/components/glossary/GlossaryManager.vue'
import Toast from '@/components/common/Toast.vue'

// Stores
const settingsStore = useSettingsStore()
const documentStore = useDocumentStore()
const translationStore = useTranslationStore()
const historyStore = useHistoryStore()
const glossaryStore = useGlossaryStore()

// Composables
const { toggleTheme } = useTheme()
const toast = useToast()
const translation = useTranslation()

// UI state
const showSettings = ref(false)
const showHistory = ref(false)
const showGlossary = ref(false)
const showApiKeySetup = ref(false)
const splitPaneRef = ref<InstanceType<typeof SplitPane> | null>(null)
const pdfViewerRef = ref<InstanceType<typeof PdfViewer> | null>(null)
const translationPanelRef = ref<InstanceType<typeof TranslationPanel> | null>(null)

// File input ref for click-to-select
const fileInputRef = ref<HTMLInputElement | null>(null)

// Sync scroll setup
const leftPaneRef = ref<HTMLElement | null>(null)
const rightPaneRef = ref<HTMLElement | null>(null)
useSyncScroll(leftPaneRef, rightPaneRef)

// Check if first-time setup needed
onMounted(async () => {
  if (!settingsStore.setupCompleted) {
    showApiKeySetup.value = true
  }
  await historyStore.loadRecords()
  await glossaryStore.loadEntries()
})

// Watch for pane refs from child components
watch([pdfViewerRef, translationPanelRef], () => {
  if (pdfViewerRef.value) {
    leftPaneRef.value = (pdfViewerRef.value as any).containerRef ?? null
  }
  if (translationPanelRef.value) {
    rightPaneRef.value = (translationPanelRef.value as any).containerRef ?? null
  }
})

// File handling
async function handleFileDrop(file: File) {
  await loadFile(file)
}

function handleFileError(message: string) {
  toast.error(message)
}

function handleSelectFile() {
  fileInputRef.value?.click()
}

async function handleFileInput(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    await loadFile(file)
  }
  // Reset input so same file can be selected again
  input.value = ''
}

async function loadFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    toast.error('仅支持 PDF 格式文件')
    return
  }
  if (file.size > 100 * 1024 * 1024) {
    toast.error('文件大小不能超过 100MB')
    return
  }
  if (!settingsStore.hasApiKey && settingsStore.engine !== 'google-translate') {
    showApiKeySetup.value = true
    toast.warning('请先配置 API Key')
    return
  }

  try {
    await translation.startTranslation(file)
  } catch (e) {
    toast.error(`加载文件失败: ${e instanceof Error ? e.message : '未知错误'}`)
  }
}

// History record opening
async function handleOpenRecord(recordId: string) {
  showHistory.value = false
  const record = await historyStore.getRecord(recordId)
  if (!record) {
    toast.error('记录不存在或已被删除')
    return
  }
  toast.info(`正在加载「${record.fileName}」...`)
  // For cached records, we need the user to re-upload the file
  // But the translation results are cached
  toast.info('请重新拖入该 PDF 文件以加载翻译缓存')
}

// Page navigation
function handlePageNavigate(page: number) {
  documentStore.setCurrentPage(page)
}

function handlePageChange(page: number) {
  documentStore.setCurrentPage(page)
}

// Reading progress saving (Feature F11) — debounced to avoid excessive writes
let progressTimer: ReturnType<typeof setTimeout> | null = null

function saveReadingProgress() {
  const docId = historyStore.activeDocumentId
  if (!docId || !documentStore.hasDocument) return

  if (progressTimer) clearTimeout(progressTimer)
  progressTimer = setTimeout(() => {
    const scrollTop = (pdfViewerRef.value as any)?.containerRef?.scrollTop ?? 0
    historyStore.updateReadingProgress(docId, documentStore.currentPage, scrollTop)
  }, 2000) // Save after 2s of inactivity
}

// Watch page changes to persist reading progress
watch(() => documentStore.currentPage, () => {
  saveReadingProgress()
})

onBeforeUnmount(() => {
  // Flush pending progress save immediately on unmount
  if (progressTimer) {
    clearTimeout(progressTimer)
    const docId = historyStore.activeDocumentId
    if (docId && documentStore.hasDocument) {
      const scrollTop = (pdfViewerRef.value as any)?.containerRef?.scrollTop ?? 0
      historyStore.updateReadingProgress(docId, documentStore.currentPage, scrollTop)
    }
  }
})

// Stop translation
function handleStopTranslation() {
  translation.stopTranslation()
  toast.info('翻译已停止')
}

// Setup completion
function handleSetupComplete() {
  showApiKeySetup.value = false
  toast.success('配置完成，可以开始使用了')
}

// Keyboard shortcuts
useKeyboard([
  {
    key: 'o',
    ctrl: true,
    handler: () => handleSelectFile(),
    description: '打开文件',
  },
  {
    key: 'd',
    ctrl: true,
    handler: () => {
      toggleTheme()
    },
    description: '切换主题',
  },
  {
    key: 'g',
    ctrl: true,
    handler: () => { showGlossary.value = !showGlossary.value },
    description: '术语表',
  },
  {
    key: 'h',
    ctrl: true,
    handler: () => { showHistory.value = !showHistory.value },
    description: '历史记录',
  },
  {
    key: ',',
    ctrl: true,
    handler: () => { showSettings.value = !showSettings.value },
    description: '设置',
  },
  {
    key: ' ',
    ctrl: false,
    handler: () => {
      if (translationStore.isTranslating) {
        translation.pauseTranslation()
        return true
      } else if (translationStore.isPaused) {
        translation.resumeTranslation()
        return true
      }
      // Not translating — don't prevent default scroll behavior
      return false
    },
    description: '暂停/继续翻译',
  },
  {
    key: 'Escape',
    handler: () => {
      // First priority: close any open panel
      if (showSettings.value || showHistory.value || showGlossary.value || showApiKeySetup.value) {
        showSettings.value = false
        showHistory.value = false
        showGlossary.value = false
        showApiKeySetup.value = false
        return true
      }
      // Second priority: stop active translation
      if (translationStore.isTranslating || translationStore.isPaused) {
        handleStopTranslation()
        return true
      }
      return false
    },
    description: '关闭面板 / 停止翻译',
  },
])

// Recent items for empty state
const recentItems = ref<Array<{ fileName: string; translatedAt: number }>>([])
watch(() => historyStore.sortedRecords, (records) => {
  recentItems.value = records.slice(0, 5).map(r => ({
    fileName: r.fileName,
    translatedAt: r.lastOpenedAt || r.translatedAt,
  }))
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col h-screen w-screen overflow-hidden"
       :style="{ backgroundColor: 'var(--color-bg-primary)' }">
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".pdf"
      class="hidden"
      @change="handleFileInput"
    />

    <!-- Header -->
    <AppHeader
      @toggle-theme="toggleTheme"
      @open-settings="showSettings = true"
      @open-history="showHistory = true"
      @stop-translation="handleStopTranslation"
    />

    <!-- Main Content -->
    <main
      class="flex-1 overflow-hidden"
      :style="{ background: 'var(--color-bg-tertiary)' }"
    >
      <!-- Empty State (no document loaded) -->
      <EmptyState
        v-if="!documentStore.hasDocument"
        :recent-items="recentItems"
        @select-file="handleSelectFile"
        @open-history-item="(index: number) => {
          const record = historyStore.sortedRecords[index]
          if (record) handleOpenRecord(record.id)
        }"
      />

      <!-- Document View (PDF + Translation) -->
      <SplitPane v-else ref="splitPaneRef">
        <template #left>
          <div class="relative h-full">
            <PdfViewer
              ref="pdfViewerRef"
              @page-change="handlePageChange"
            />
            <PdfPageNav
              :current-page="documentStore.currentPage"
              :total-pages="documentStore.totalPages"
              @navigate="handlePageNavigate"
            />
          </div>
        </template>
        <template #right>
          <TranslationPanel
            ref="translationPanelRef"
          />
        </template>
      </SplitPane>
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Global Drop Zone -->
    <PdfDropZone
      @file-dropped="handleFileDrop"
      @file-error="handleFileError"
    />

    <!-- API Key Setup Wizard -->
    <ApiKeySetup
      :show="showApiKeySetup"
      @close="showApiKeySetup = false"
      @complete="handleSetupComplete"
    />

    <!-- Settings Drawer -->
    <SettingsDrawer
      :show="showSettings"
      @close="showSettings = false"
    />

    <!-- History Panel -->
    <HistoryPanel
      :show="showHistory"
      @close="showHistory = false"
      @open-record="handleOpenRecord"
    />

    <!-- Glossary Manager -->
    <GlossaryManager
      :show="showGlossary"
      @close="showGlossary = false"
    />

    <!-- Toast Notifications -->
    <Toast />
  </div>
</template>
