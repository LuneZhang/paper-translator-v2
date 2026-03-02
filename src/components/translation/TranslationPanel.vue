<script setup lang="ts">
/**
 * TranslationPanel — Immersive translation overlay on PDF pages.
 *
 * Renders the same PDF as the left panel, then overlays translated text
 * blocks below each paragraph's original position — matching the
 * "沉浸式翻译" experience for academic papers.
 */
import {
  ref,
  watch,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue'
import { useDocumentStore } from '@/stores/document'
import { useTranslationStore } from '@/stores/translation'
import { useSettingsStore } from '@/stores/settings'
import { useTranslation } from '@/composables/useTranslation'
import { usePdfRenderer } from '@/composables/usePdfRenderer'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import IconButton from '@/components/common/IconButton.vue'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'
import type { TranslatedParagraph } from '@/types/translation'

const documentStore = useDocumentStore()
const translationStore = useTranslationStore()
const settingsStore = useSettingsStore()
const { pauseTranslation, resumeTranslation, stopTranslation } = useTranslation()
const { loadDocument, renderPage, pdfDoc, pageCount } = usePdfRenderer()

// Refs
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRefs = ref<Map<number, HTMLCanvasElement>>(new Map())

defineExpose({ containerRef })

// ── Page dimensions & rendering state ────────────────────────────
interface PageDimension {
  width: number
  height: number
}
const pageDimensions = ref<PageDimension[]>([])
const renderedPages = ref<Set<number>>(new Set())
const isDocumentLoaded = ref(false)

const PAGE_GAP = 20
const DEFAULT_PAGE_WIDTH = 612 * 1.5
const DEFAULT_PAGE_HEIGHT = 792 * 1.5

const visibleRange = ref<{ start: number; end: number }>({ start: 0, end: 0 })
const totalPageCount = computed(() => pageCount.value)

// ── Document loading ─────────────────────────────────────────────
watch(
  () => documentStore.pdfData,
  async (data) => {
    if (!data) {
      resetState()
      return
    }
    await loadPdf(data)
  },
  { immediate: true },
)

async function loadPdf(data: ArrayBuffer) {
  try {
    const pdf = await loadDocument(data)
    isDocumentLoaded.value = true
    await computePageDimensions(pdf, documentStore.scale)
    await nextTick()
    updateVisibleRange()
    renderVisiblePages()
  } catch (err) {
    console.error('[TranslationPanel] Failed to load PDF:', err)
  }
}

async function computePageDimensions(pdf: PDFDocumentProxy, scale: number) {
  const dims: PageDimension[] = []
  for (let i = 0; i < pdf.numPages; i++) {
    const page = await pdf.getPage(i + 1)
    const vp = page.getViewport({ scale })
    dims.push({ width: vp.width, height: vp.height })
  }
  pageDimensions.value = dims
}

function resetState() {
  isDocumentLoaded.value = false
  renderedPages.value = new Set()
  pageDimensions.value = []
  canvasRefs.value = new Map()
}

// ── Virtual rendering ────────────────────────────────────────────
function updateVisibleRange() {
  const container = containerRef.value
  if (!container || pageDimensions.value.length === 0) return

  const scrollTop = container.scrollTop
  const viewHeight = container.clientHeight

  let startPage = 0
  let endPage = 0
  let cumulativeTop = 0

  for (let i = 0; i < pageDimensions.value.length; i++) {
    const dim = pageDimensions.value[i]!
    const pageBottom = cumulativeTop + dim.height
    if (pageBottom >= scrollTop) {
      startPage = i
      break
    }
    cumulativeTop += dim.height + PAGE_GAP
  }

  cumulativeTop = 0
  for (let i = 0; i < pageDimensions.value.length; i++) {
    const dim = pageDimensions.value[i]!
    if (cumulativeTop > scrollTop + viewHeight) break
    endPage = i
    cumulativeTop += dim.height + PAGE_GAP
  }

  const bufferedStart = Math.max(0, startPage - 1)
  const bufferedEnd = Math.min(pageDimensions.value.length - 1, endPage + 1)
  visibleRange.value = { start: bufferedStart, end: bufferedEnd }
}

function renderVisiblePages() {
  if (!pdfDoc.value) return
  const { start, end } = visibleRange.value
  for (let i = start; i <= end; i++) {
    if (!renderedPages.value.has(i)) {
      renderSinglePage(i)
    }
  }
}

async function renderSinglePage(pageIndex: number) {
  const pdf = pdfDoc.value
  if (!pdf) return
  await nextTick()
  const canvas = canvasRefs.value.get(pageIndex)
  if (!canvas) return
  renderedPages.value.add(pageIndex)
  try {
    await renderPage(pdf, pageIndex, canvas, documentStore.scale)
  } catch (err) {
    console.error(`[TranslationPanel] Failed to render page ${pageIndex}:`, err)
    renderedPages.value.delete(pageIndex)
  }
}

function isPageInRange(pageIndex: number): boolean {
  return (
    pageIndex >= visibleRange.value.start &&
    pageIndex <= visibleRange.value.end
  )
}

function getPageTop(pageIndex: number): number {
  let top = 0
  for (let i = 0; i < pageIndex && i < pageDimensions.value.length; i++) {
    top += pageDimensions.value[i]!.height + PAGE_GAP
  }
  return top
}

function getPageDim(pageIndex: number): PageDimension {
  return (
    pageDimensions.value[pageIndex] ?? {
      width: DEFAULT_PAGE_WIDTH,
      height: DEFAULT_PAGE_HEIGHT,
    }
  )
}

const totalContentHeight = computed(() => {
  if (pageDimensions.value.length === 0) return 0
  let h = 0
  for (const dim of pageDimensions.value) h += dim.height + PAGE_GAP
  return h - PAGE_GAP
})

// ── Canvas ref management ────────────────────────────────────────
function setCanvasRef(pageIndex: number, el: unknown) {
  if (el instanceof HTMLCanvasElement) {
    canvasRefs.value.set(pageIndex, el)
  } else {
    canvasRefs.value.delete(pageIndex)
  }
}

// ── Scroll handling ──────────────────────────────────────────────
let scrollRaf = 0
function onScroll() {
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    updateVisibleRange()
    renderVisiblePages()
  })
}

// ── Watch for scale changes ──────────────────────────────────────
watch(
  () => documentStore.scale,
  async (newScale) => {
    if (!pdfDoc.value) return
    renderedPages.value = new Set()
    await computePageDimensions(pdfDoc.value, newScale)
    await nextTick()
    updateVisibleRange()
    renderVisiblePages()
  },
)

// ── Translation overlay helpers ──────────────────────────────────
function getPageTranslations(pageIndex: number): TranslatedParagraph[] {
  return translationStore.translatedByPage.get(pageIndex) ?? []
}

function getOverlayStyle(para: TranslatedParagraph) {
  const scale = documentStore.scale
  const rect = para.boundingRect
  return {
    top: `${rect.top * scale - 2}px`, // Slight negative offset to cover ascenders
    left: `${rect.left * scale - 2}px`, // Slight negative offset to cover left overhang
    width: `${rect.width * scale + 4}px`, // Expand slightly to cover original fully
    minHeight: `${rect.height * scale + 4}px`,
  }
}

// ── Formula segment parsing ──────────────────────────────────────
interface Segment {
  type: 'text' | 'formula'
  content: string
}

function parseSegments(para: TranslatedParagraph): Segment[] {
  const text = para.translatedText
  if (!text) return []

  const formulaMap = new Map(
    para.formulas.map((f) => [f.placeholder, f.original]),
  )
  const parts = text.split(/(<formula_\d+>)/g)
  const result: Segment[] = []

  for (const part of parts) {
    if (!part) continue
    const original = formulaMap.get(part)
    if (original !== undefined) {
      result.push({ type: 'formula', content: original })
    } else {
      result.push({ type: 'text', content: part })
    }
  }
  return result
}

// ── Toolbar actions ──────────────────────────────────────────────
function decreaseFontSize() {
  settingsStore.setFontSize(settingsStore.fontSize - 1)
}
function increaseFontSize() {
  settingsStore.setFontSize(settingsStore.fontSize + 1)
}
function togglePause() {
  if (translationStore.isPaused) resumeTranslation()
  else pauseTranslation()
}

// ── Lifecycle ────────────────────────────────────────────────────
onMounted(() => {
  containerRef.value?.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  containerRef.value?.removeEventListener('scroll', onScroll)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
})
</script>

<template>
  <div
    class="flex flex-col h-full"
  >
    <!-- ─── Toolbar ─────────────────────────────────────────── -->
    <div
      class="flex items-center justify-between px-5 py-2.5 shrink-0"
      :style="{
        borderBottom: '1px solid var(--color-border)',
      }"
    >
      <!-- Font size controls -->
      <div class="flex items-center gap-1.5">
        <IconButton
          title="减小字号"
          size="sm"
          :disabled="settingsStore.fontSize <= 14"
          @click="decreaseFontSize"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>
        </IconButton>
        <span
          class="text-xs min-w-[2rem] text-center tabular-nums select-none font-medium"
          :style="{ color: 'var(--color-text-secondary)' }"
        >
          {{ settingsStore.fontSize }}
        </span>
        <IconButton
          title="增大字号"
          size="sm"
          :disabled="settingsStore.fontSize >= 24"
          @click="increaseFontSize"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </IconButton>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- Sync scroll toggle -->
        <IconButton
          title="同步滚动"
          size="sm"
          :active="settingsStore.syncScroll"
          @click="settingsStore.setSyncScroll(!settingsStore.syncScroll)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </IconButton>

        <!-- Pause / resume -->
        <IconButton
          v-if="translationStore.isTranslating || translationStore.isPaused"
          :title="translationStore.isPaused ? '继续翻译' : '暂停翻译'"
          size="sm"
          :active="translationStore.isPaused"
          @click="togglePause"
        >
          <svg
            v-if="!translationStore.isPaused"
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          ><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          ><polygon points="5 3 19 12 5 21 5 3" /></svg>
        </IconButton>

        <!-- Stop -->
        <IconButton
          v-if="translationStore.isTranslating || translationStore.isPaused"
          title="停止翻译"
          size="sm"
          @click="stopTranslation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="1.5" /></svg>
        </IconButton>
      </div>
    </div>

    <!-- ─── Content area ────────────────────────────────────── -->
    <div
      ref="containerRef"
      class="flex-1 overflow-y-auto"
    >
      <!-- Idle state -->
      <div
        v-if="translationStore.status === 'idle' && !isDocumentLoaded"
        class="flex items-center justify-center h-full"
      >
        <span
          class="text-sm"
          :style="{ color: 'var(--color-text-tertiary)' }"
        >
          等待加载 PDF 文件...
        </span>
      </div>

      <!-- Extracting state -->
      <div
        v-else-if="translationStore.status === 'extracting' && !isDocumentLoaded"
        class="flex flex-col items-center justify-center h-full gap-4 px-10"
      >
        <span
          class="text-sm"
          :style="{ color: 'var(--color-text-secondary)' }"
        >
          正在提取文本...
        </span>
        <div class="w-full max-w-md">
          <SkeletonLoader :lines="5" />
        </div>
      </div>

      <!-- PDF pages with translation overlays -->
      <div
        v-if="isDocumentLoaded"
        class="relative mx-auto"
        :style="{
          height: `${totalContentHeight}px`,
          maxWidth: '900px',
          paddingTop: '20px',
          paddingBottom: '20px',
        }"
      >
        <div
          v-for="pageIndex in totalPageCount"
          :key="pageIndex - 1"
          class="absolute left-1/2 -translate-x-1/2"
          :style="{
            top: `${getPageTop(pageIndex - 1)}px`,
            width: `${getPageDim(pageIndex - 1).width}px`,
            height: `${getPageDim(pageIndex - 1).height}px`,
          }"
        >
          <!-- PDF canvas -->
          <canvas
            v-if="isPageInRange(pageIndex - 1)"
            :ref="(el) => setCanvasRef(pageIndex - 1, el)"
            class="block rounded-lg"
            style="background: #ffffff; box-shadow: var(--shadow-page)"
          />

          <!-- Skeleton placeholder for off-screen pages -->
          <div
            v-else
            class="flex items-center justify-center rounded-lg"
            :style="{
              width: `${getPageDim(pageIndex - 1).width}px`,
              height: `${getPageDim(pageIndex - 1).height}px`,
              background: '#ffffff',
              boxShadow: 'var(--shadow-page)',
            }"
          >
            <div class="w-3/4">
              <SkeletonLoader :lines="8" />
            </div>
          </div>

          <!-- Translation overlays (positioned on top of the page) -->
          <template v-if="isPageInRange(pageIndex - 1)">
            <div
              v-for="para in getPageTranslations(pageIndex - 1)"
              :key="para.id"
              class="immersive-block"
              :style="getOverlayStyle(para)"
            >
              <!-- Completed translation -->
              <div
                v-if="para.status === 'completed'"
                class="immersive-text"
                :style="{ fontSize: `${settingsStore.fontSize}px` }"
              >
                <template v-for="(seg, si) in parseSegments(para)" :key="si">
                  <span v-if="seg.type === 'text'">{{ seg.content }}</span>
                  <span v-else class="formula-inline">{{ seg.content }}</span>
                </template>
              </div>

              <!-- Translating / Pending -->
              <div
                v-else-if="para.status === 'translating' || para.status === 'pending'"
                class="immersive-loading"
              >
                <div class="skeleton h-3 w-4/5" />
              </div>

              <!-- Error -->
              <div
                v-else-if="para.status === 'error'"
                class="immersive-error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>翻译失败</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.immersive-block {
  position: absolute;
  z-index: 5;
  pointer-events: none;
  background-color: #ffffff; /* Match PDF canvas background to hide original text */
  padding: 0 1px; /* minimal padding just to avoid clipping at exact bounds */
  transition: opacity 0.2s ease;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
}

/* No background in dark mode, because PDF canvas remains white */
.dark .immersive-block {
  background-color: #ffffff; 
}

.immersive-text {
  color: #000000; /* Academic papers usually use pure black */
  word-break: break-word;
  text-align: justify; /* Professional justification like LaTeX */
  font-family: 'Times New Roman', 'Noto Serif SC', 'STSong', serif; /* Serif font for academic look */
  line-height: 1.45; /* Standard academic line height */
  width: 100%;
}

.immersive-loading {
  padding: 2px 0;
  width: 100%;
}

.immersive-error {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--color-error);
  pointer-events: auto;
}
</style>
