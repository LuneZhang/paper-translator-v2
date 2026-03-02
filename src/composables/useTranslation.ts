/**
 * Translation flow composable — core orchestrator.
 *
 * Manages the full lifecycle: file hash → cache check → text extraction →
 * viewport-priority translation → history persistence.
 */

import { ref } from 'vue'
import { useDocumentStore } from '@/stores/document'
import { useTranslationStore } from '@/stores/translation'
import { useSettingsStore } from '@/stores/settings'
import { useHistoryStore } from '@/stores/history'
import { useGlossaryStore } from '@/stores/glossary'
import { translateText } from '@/services/api'
import { protectFormulas, restoreFormulas } from '@/utils/formula-detector'
import { usePdfTextExtractor } from '@/composables/usePdfTextExtractor'
import { computeFileHash } from '@/services/file-hash'
import type { TranslatedParagraph } from '@/types/translation'
import type { PdfParagraph } from '@/types/pdf'

// ── Module-level singleton state ──────────────────────────────────
// Shared across all useTranslation() callers so that stop/pause/resume
// from TranslationPanel actually controls the translation started by App.vue.
const abortController = ref<AbortController | null>(null)
const isProcessing = ref(false)
let pauseResolver: (() => void) | null = null
let singletonExtractor: ReturnType<typeof usePdfTextExtractor> | null = null

function getExtractor() {
  if (!singletonExtractor) {
    singletonExtractor = usePdfTextExtractor()
  }
  return singletonExtractor
}

export function useTranslation() {
  const documentStore = useDocumentStore()
  const translationStore = useTranslationStore()
  const settingsStore = useSettingsStore()
  const historyStore = useHistoryStore()
  const glossaryStore = useGlossaryStore()
  const pdfTextExtractor = getExtractor()

  // ── Helpers ──────────────────────────────────────────────

  /**
   * Returns a promise that resolves when the user resumes (or immediately if
   * not paused).
   */
  function waitWhilePaused(): Promise<void> {
    if (!translationStore.isPaused) return Promise.resolve()
    return new Promise<void>((resolve) => {
      pauseResolver = resolve
    })
  }

  /**
   * Build a viewport-priority ordered list of paragraph indices.
   * Start from the current visible page and expand outward.
   */
  function buildPriorityOrder(paragraphs: PdfParagraph[]): PdfParagraph[] {
    const currentPage = documentStore.currentPage
    const byPage = new Map<number, PdfParagraph[]>()

    for (const p of paragraphs) {
      const list = byPage.get(p.pageIndex) ?? []
      list.push(p)
      byPage.set(p.pageIndex, list)
    }

    const allPages = [...byPage.keys()].sort((a, b) => a - b)
    if (allPages.length === 0) return []

    // Order pages by distance from the current page
    const ordered = [...allPages].sort(
      (a, b) => Math.abs(a - currentPage) - Math.abs(b - currentPage),
    )

    const result: PdfParagraph[] = []
    for (const page of ordered) {
      const pageParagraphs = byPage.get(page) ?? []
      result.push(...pageParagraphs)
    }
    return result
  }

  /**
   * Translate a single paragraph: protect formulas → API call → restore.
   */
  async function translateSingleParagraph(
    paragraph: PdfParagraph,
    context: { title?: string; abstract?: string },
    glossary: Record<string, string>,
  ): Promise<TranslatedParagraph> {
    const { cleanText, formulas } = protectFormulas(paragraph.text)

    const response = await translateText({
      text: cleanText,
      context,
      glossary,
      engine: settingsStore.engine,
      apiKey: settingsStore.apiKey,
    })

    const translatedText = restoreFormulas(response.translation, formulas)

    return {
      id: `${paragraph.pageIndex}-${paragraph.index}`,
      pageIndex: paragraph.pageIndex,
      paragraphIndex: paragraph.index,
      originalText: paragraph.text,
      translatedText,
      formulas: formulas.map((f) => ({
        placeholder: f.placeholder,
        original: f.original,
      })),
      boundingRect: { ...paragraph.boundingRect },
      status: 'completed',
    }
  }

  // ── Public API ───────────────────────────────────────────

  async function startTranslation(file: File) {
    if (isProcessing.value) return
    isProcessing.value = true
    abortController.value = new AbortController()

    try {
      // 1. Read file & compute hash
      const arrayBuffer = await file.arrayBuffer()
      const hash = await computeFileHash(file)

      // 2. Store document
      documentStore.setDocument(file, arrayBuffer, hash)

      // 3. Check cache
      const cached = await historyStore.getRecord(hash)
      if (cached && cached.paragraphs.length > 0) {
        translationStore.loadFromCache(cached.paragraphs)
        translationStore.setProgress({
          totalPages: cached.totalPages,
          currentPage: cached.totalPages,
        })
        historyStore.setActiveDocument(hash)
        isProcessing.value = false
        return
      }

      // 4. Extract text
      translationStore.setStatus('extracting')
      await pdfTextExtractor.loadDocument(arrayBuffer)
      documentStore.setTotalPages(pdfTextExtractor.pageCount.value)

      const allParagraphs = await pdfTextExtractor.extractAllText()
      documentStore.setParagraphs(allParagraphs)

      // 5. Extract context (as object, matching backend API)
      const context = await pdfTextExtractor.extractContext()

      // 6. Set progress totals
      translationStore.setProgress({
        total: allParagraphs.length,
        translated: 0,
        totalPages: documentStore.totalPages,
        currentPage: 0,
      })

      // Seed pending placeholders so the UI can show skeletons
      for (const p of allParagraphs) {
        translationStore.addTranslatedParagraph({
          id: `${p.pageIndex}-${p.index}`,
          pageIndex: p.pageIndex,
          paragraphIndex: p.index,
          originalText: p.text,
          translatedText: '',
          formulas: [],
          boundingRect: { ...p.boundingRect },
          status: 'pending',
        })
      }

      // 7. Begin translating with viewport priority
      translationStore.setStatus('translating')
      historyStore.setActiveDocument(hash)
      const glossary = glossaryStore.glossaryMap
      const prioritized = buildPriorityOrder(allParagraphs)

      for (const paragraph of prioritized) {
        // Check abort
        if (abortController.value?.signal.aborted) break

        // Wait while paused
        await waitWhilePaused()
        if (abortController.value?.signal.aborted) break

        const paragraphId = `${paragraph.pageIndex}-${paragraph.index}`

        // Mark as translating
        translationStore.updateParagraph(paragraphId, { status: 'translating' })
        translationStore.setProgress({ currentPage: paragraph.pageIndex + 1 })

        try {
          const translated = await translateSingleParagraph(paragraph, context, glossary)
          translationStore.addTranslatedParagraph(translated)
        } catch (err) {
          translationStore.updateParagraph(paragraphId, {
            status: 'error',
            translatedText: err instanceof Error ? err.message : 'Translation failed',
          })
        }
      }

      // 8. Finalize
      if (!abortController.value?.signal.aborted) {
        translationStore.setStatus('completed')

        // Save to history
        await historyStore.saveRecord({
          id: hash,
          fileName: file.name,
          fileSize: file.size,
          totalPages: documentStore.totalPages,
          translatedAt: Date.now(),
          lastOpenedAt: Date.now(),
          readingProgress: { page: 0, scrollTop: 0 },
          paragraphs: [...translationStore.paragraphs],
          context,
          cacheSize: new Blob([JSON.stringify(translationStore.paragraphs)]).size,
        })
      }
    } catch (err) {
      console.error('[useTranslation] Translation failed:', err)
      translationStore.setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      isProcessing.value = false
    }
  }

  function pauseTranslation() {
    translationStore.setStatus('paused')
  }

  function resumeTranslation() {
    translationStore.setStatus('translating')
    if (pauseResolver) {
      pauseResolver()
      pauseResolver = null
    }
  }

  async function retranslateParagraph(paragraphId: string) {
    const sourceParagraph = documentStore.paragraphs.find(
      (p) => `${p.pageIndex}-${p.index}` === paragraphId,
    )
    if (!sourceParagraph) return

    translationStore.updateParagraph(paragraphId, { status: 'translating' })

    const context = await pdfTextExtractor.extractContext()
    const glossary = glossaryStore.glossaryMap

    try {
      const translated = await translateSingleParagraph(sourceParagraph, context, glossary)
      translationStore.addTranslatedParagraph(translated)
    } catch (err) {
      translationStore.updateParagraph(paragraphId, {
        status: 'error',
        translatedText: err instanceof Error ? err.message : 'Translation failed',
      })
    }
  }

  function stopTranslation() {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
    // Resolve any pending pause wait
    if (pauseResolver) {
      pauseResolver()
      pauseResolver = null
    }
    translationStore.reset()
    isProcessing.value = false
  }

  return {
    isProcessing,
    startTranslation,
    pauseTranslation,
    resumeTranslation,
    retranslateParagraph,
    stopTranslation,
  }
}
