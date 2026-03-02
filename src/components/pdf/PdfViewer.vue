<script setup lang="ts">
/**
 * PdfViewer — Renders PDF pages as canvases in a scrollable container.
 *
 * Uses virtual rendering: only visible pages (plus 1 buffer page above/below)
 * are rendered to canvas. Unrendered pages show a skeleton placeholder.
 * Reads state from useDocumentStore (pdfData, scale, currentPage, totalPages).
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
import { usePdfRenderer } from '@/composables/usePdfRenderer'
import SkeletonLoader from '@/components/common/SkeletonLoader.vue'
import type { PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api'

const emit = defineEmits<{
  'page-change': [pageIndex: number]
}>()

const documentStore = useDocumentStore()
const { loadDocument, renderPage, pdfDoc, pageCount } = usePdfRenderer()

// Refs
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRefs = ref<Map<number, HTMLCanvasElement>>(new Map())

/** Dimensions per page (width/height at current scale), computed after load */
interface PageDimension {
  width: number
  height: number
}
const pageDimensions = ref<PageDimension[]>([])
const renderedPages = ref<Set<number>>(new Set())
const isDocumentLoaded = ref(false)

// Page gap constant
const PAGE_GAP = 20

// Default page dimensions before we know the real size
const DEFAULT_PAGE_WIDTH = 612 * 1.5
const DEFAULT_PAGE_HEIGHT = 792 * 1.5

/** Visible page range (inclusive) */
const visibleRange = ref<{ start: number; end: number }>({ start: 0, end: 0 })

const totalPageCount = computed(() => pageCount.value)

// ── Document loading ──────────────────────────────────────────────

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
    documentStore.setTotalPages(pdf.numPages)
    isDocumentLoaded.value = true

    // Pre-compute page dimensions at current scale
    await computePageDimensions(pdf, documentStore.scale)

    await nextTick()
    updateVisibleRange()
    renderVisiblePages()
  } catch (err) {
    console.error('[PdfViewer] Failed to load PDF:', err)
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

// ── Virtual rendering ─────────────────────────────────────────────

function updateVisibleRange() {
  const container = containerRef.value
  if (!container || pageDimensions.value.length === 0) return

  const scrollTop = container.scrollTop
  const viewHeight = container.clientHeight

  let cumulativeTop = 0
  let startPage = 0
  let endPage = 0

  for (let i = 0; i < pageDimensions.value.length; i++) {
    const dim = pageDimensions.value[i]!
    const pageBottom = cumulativeTop + dim.height

    if (pageBottom >= scrollTop) {
      startPage = i
      break
    }
    cumulativeTop += dim.height + PAGE_GAP
  }

  // Continue to find the last visible page
  cumulativeTop = 0
  for (let i = 0; i < pageDimensions.value.length; i++) {
    const dim = pageDimensions.value[i]!
    if (cumulativeTop > scrollTop + viewHeight) {
      break
    }
    endPage = i
    cumulativeTop += dim.height + PAGE_GAP
  }

  // Add 1-page buffer above and below
  const bufferedStart = Math.max(0, startPage - 1)
  const bufferedEnd = Math.min(pageDimensions.value.length - 1, endPage + 1)

  visibleRange.value = { start: bufferedStart, end: bufferedEnd }

  // Determine the primary visible page (the one most in view)
  const viewCenter = scrollTop + viewHeight / 2
  let accumulated = 0
  for (let i = 0; i < pageDimensions.value.length; i++) {
    const dim = pageDimensions.value[i]!
      if (accumulated + dim.height / 2 >= viewCenter) {
      if (documentStore.currentPage !== i) {
        // Prevent the watcher from scrolling back to this page
        ignoreNextPageChange = true
        documentStore.setCurrentPage(i)
        emit('page-change', i)
      }
      break
    }
    accumulated += dim.height + PAGE_GAP
  }
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

  // Wait for the canvas to be mounted
  await nextTick()
  const canvas = canvasRefs.value.get(pageIndex)
  if (!canvas) return

  // Mark as rendered immediately to avoid duplicate renders
  renderedPages.value.add(pageIndex)

  try {
    await renderPage(pdf, pageIndex, canvas, documentStore.scale)
  } catch (err) {
    console.error(`[PdfViewer] Failed to render page ${pageIndex}:`, err)
    renderedPages.value.delete(pageIndex)
  }
}

function isPageInRange(pageIndex: number): boolean {
  return pageIndex >= visibleRange.value.start && pageIndex <= visibleRange.value.end
}

function getPageTop(pageIndex: number): number {
  let top = 0
  for (let i = 0; i < pageIndex && i < pageDimensions.value.length; i++) {
    top += pageDimensions.value[i]!.height + PAGE_GAP
  }
  return top
}

function getPageDim(pageIndex: number): PageDimension {
  return pageDimensions.value[pageIndex] ?? {
    width: DEFAULT_PAGE_WIDTH,
    height: DEFAULT_PAGE_HEIGHT,
  }
}

/** Total scroll height of all pages */
const totalContentHeight = computed(() => {
  if (pageDimensions.value.length === 0) return 0
  let h = 0
  for (const dim of pageDimensions.value) {
    h += dim.height + PAGE_GAP
  }
  return h - PAGE_GAP // no gap after the last page
})

// ── Canvas ref management ─────────────────────────────────────────

function setCanvasRef(pageIndex: number, el: unknown) {
  if (el instanceof HTMLCanvasElement) {
    canvasRefs.value.set(pageIndex, el)
  } else {
    canvasRefs.value.delete(pageIndex)
  }
}

// ── Scroll handling ───────────────────────────────────────────────

let scrollRaf = 0
function onScroll() {
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
  scrollRaf = requestAnimationFrame(() => {
    updateVisibleRange()
    renderVisiblePages()
  })
}

// ── Watch for scale changes → re-render all visible pages ─────────

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

// ── Watch for external currentPage changes → scroll to page ──────

let ignoreNextPageChange = false
watch(
  () => documentStore.currentPage,
  (page) => {
    if (ignoreNextPageChange) {
      ignoreNextPageChange = false
      return
    }
    scrollToPage(page)
  },
)

function scrollToPage(pageIndex: number) {
  const container = containerRef.value
  if (!container || pageDimensions.value.length === 0) return

  const top = getPageTop(pageIndex)
  container.scrollTo({ top, behavior: 'smooth' })
}

// ── Lifecycle ─────────────────────────────────────────────────────

onMounted(() => {
  containerRef.value?.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  containerRef.value?.removeEventListener('scroll', onScroll)
  if (scrollRaf) cancelAnimationFrame(scrollRaf)
})

// Expose container ref for external scroll sync
defineExpose({ containerRef })
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full w-full overflow-y-auto"
    :style="{ background: 'var(--color-bg-tertiary)' }"
  >
    <!-- Scroll content spacer -->
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
      <!-- Pages -->
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
        <!-- Rendered canvas -->
        <canvas
          v-if="isPageInRange(pageIndex - 1)"
          :ref="(el) => setCanvasRef(pageIndex - 1, el)"
          class="block"
          :style="{
            borderRadius: 'var(--radius-md)',
            background: '#ffffff',
            boxShadow: 'var(--shadow-page)',
          }"
        />

        <!-- Skeleton placeholder for pages out of range -->
        <div
          v-else
          class="flex items-center justify-center"
          :style="{
            width: `${getPageDim(pageIndex - 1).width}px`,
            height: `${getPageDim(pageIndex - 1).height}px`,
            background: '#ffffff',
            boxShadow: 'var(--shadow-page)',
            borderRadius: 'var(--radius-md)',
          }"
        >
          <div class="w-3/4">
            <SkeletonLoader :lines="8" />
          </div>
        </div>
      </div>
    </div>

    <!-- Initial loading state -->
    <div
      v-if="!isDocumentLoaded && documentStore.isLoading"
      class="flex h-full items-center justify-center"
    >
      <div class="w-64">
        <SkeletonLoader :lines="5" />
      </div>
    </div>
  </div>
</template>
