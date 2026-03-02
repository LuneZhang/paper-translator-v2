/**
 * PDF.js rendering composable
 *
 * Loads a PDF document, renders individual pages to canvas elements,
 * and extracts text content with positional data.
 */

import { shallowRef, ref } from 'vue'
import * as pdfjsLib from 'pdfjs-dist'
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  TextItem,
} from 'pdfjs-dist/types/src/display/api'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString()

export interface RenderedTextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontName: string
}

export function usePdfRenderer() {
  const pdfDoc = shallowRef<PDFDocumentProxy | null>(null)
  const pageCount = ref(0)

  /**
   * Load a PDF document from raw ArrayBuffer data.
   */
  async function loadDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
    // Clone buffer to prevent detachment when multiple consumers load the same data
    const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) })
    const pdf = await loadingTask.promise
    pdfDoc.value = pdf
    pageCount.value = pdf.numPages
    return pdf
  }

  /**
   * Render a single page to a canvas element.
   * Returns the viewport used for rendering.
   */
  async function renderPage(
    pdf: PDFDocumentProxy,
    pageIndex: number,
    canvas: HTMLCanvasElement,
    scale: number,
  ) {
    // PDF.js uses 1-based page numbers
    const page: PDFPageProxy = await pdf.getPage(pageIndex + 1)
    const viewport = page.getViewport({ scale })

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get canvas 2d context')
    }

    // Account for device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.floor(viewport.width * dpr)
    canvas.height = Math.floor(viewport.height * dpr)
    canvas.style.width = `${viewport.width}px`
    canvas.style.height = `${viewport.height}px`
    ctx.scale(dpr, dpr)

    await page.render({ canvasContext: ctx, viewport }).promise

    return viewport
  }

  /**
   * Extract text content from a page with positional information.
   */
  async function getTextContent(
    pdf: PDFDocumentProxy,
    pageIndex: number,
  ): Promise<RenderedTextItem[]> {
    const page: PDFPageProxy = await pdf.getPage(pageIndex + 1)
    const textContent = await page.getTextContent()
    const viewport = page.getViewport({ scale: 1.0 })

    const items: RenderedTextItem[] = []

    for (const item of textContent.items) {
      // Skip non-text items (marked content, etc.)
      if (!('str' in item)) continue
      const textItem = item as TextItem
      if (!textItem.str) continue

      // Transform PDF coordinates to viewport coordinates.
      // PDF text items have a `transform` array: [scaleX, skewY, skewX, scaleY, translateX, translateY]
      const tx = textItem.transform
      if (!tx) continue

      const fontSize = Math.sqrt(tx[2]! * tx[2]! + tx[3]! * tx[3]!)
      const x = tx[4]!
      // PDF y-axis is bottom-up; convert to top-down
      const y = viewport.height - tx[5]! - fontSize

      items.push({
        text: textItem.str,
        x,
        y,
        width: textItem.width ?? 0,
        height: textItem.height ?? fontSize,
        fontName: textItem.fontName ?? '',
      })
    }

    return items
  }

  return {
    pdfDoc,
    pageCount,
    loadDocument,
    renderPage,
    getTextContent,
  }
}
