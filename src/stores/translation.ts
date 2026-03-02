import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TranslatedParagraph, TranslationStatus, TranslationProgress } from '@/types/translation'

export const useTranslationStore = defineStore('translation', () => {
  // State
  const status = ref<TranslationStatus>('idle')
  const paragraphs = ref<TranslatedParagraph[]>([])
  const progress = ref<TranslationProgress>({
    translated: 0,
    total: 0,
    currentPage: 0,
    totalPages: 0,
  })
  const error = ref<string>('')
  const highlightedParagraphId = ref<string | null>(null)

  // Computed
  const isTranslating = computed(() => status.value === 'translating')
  const isPaused = computed(() => status.value === 'paused')
  const isCompleted = computed(() => status.value === 'completed')
  const hasError = computed(() => status.value === 'error')
  const progressPercent = computed(() =>
    progress.value.total > 0
      ? Math.round((progress.value.translated / progress.value.total) * 100)
      : 0
  )

  const translatedByPage = computed(() => {
    const map = new Map<number, TranslatedParagraph[]>()
    for (const p of paragraphs.value) {
      const list = map.get(p.pageIndex) ?? []
      list.push(p)
      map.set(p.pageIndex, list)
    }
    return map
  })

  // Actions
  function setStatus(s: TranslationStatus) {
    status.value = s
  }

  function setProgress(p: Partial<TranslationProgress>) {
    progress.value = { ...progress.value, ...p }
  }

  function addTranslatedParagraph(paragraph: TranslatedParagraph) {
    const idx = paragraphs.value.findIndex(p => p.id === paragraph.id)
    if (idx >= 0) {
      paragraphs.value[idx] = paragraph
    } else {
      paragraphs.value.push(paragraph)
    }
    progress.value.translated = paragraphs.value.filter(p => p.status === 'completed').length
  }

  function updateParagraph(id: string, update: Partial<TranslatedParagraph>) {
    const idx = paragraphs.value.findIndex(p => p.id === id)
    if (idx >= 0) {
      paragraphs.value[idx] = { ...paragraphs.value[idx]!, ...update }
    }
  }

  function setHighlightedParagraph(id: string | null) {
    highlightedParagraphId.value = id
  }

  function setError(msg: string) {
    error.value = msg
    status.value = 'error'
  }

  function loadFromCache(cached: TranslatedParagraph[]) {
    paragraphs.value = cached
    progress.value.translated = cached.length
    progress.value.total = cached.length
    status.value = 'completed'
  }

  function reset() {
    status.value = 'idle'
    paragraphs.value = []
    progress.value = { translated: 0, total: 0, currentPage: 0, totalPages: 0 }
    error.value = ''
    highlightedParagraphId.value = null
  }

  return {
    status,
    paragraphs,
    progress,
    error,
    highlightedParagraphId,
    isTranslating,
    isPaused,
    isCompleted,
    hasError,
    progressPercent,
    translatedByPage,
    setStatus,
    setProgress,
    addTranslatedParagraph,
    updateParagraph,
    setHighlightedParagraph,
    setError,
    loadFromCache,
    reset,
  }
})
