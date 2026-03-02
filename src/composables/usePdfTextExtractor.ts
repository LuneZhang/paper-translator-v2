/**
 * PDF text extraction composable
 *
 * Extracts text from PDF pages, groups items into lines and paragraphs
 * spatially, and computes accurate bounding rects from actual text positions.
 */

import { usePdfRenderer } from '@/composables/usePdfRenderer'
import type { RenderedTextItem } from '@/composables/usePdfRenderer'
import { protectFormulas } from '@/utils/formula-detector'
import { isValidParagraph } from '@/utils/text-segmenter'
import type { PdfParagraph, BoundingRect } from '@/types/pdf'

export function usePdfTextExtractor() {
  const { pdfDoc, pageCount, loadDocument, getTextContent } = usePdfRenderer()

  // ── Internal types ─────────────────────────────────────────

  interface TextLine {
    items: RenderedTextItem[]
    /** Weighted-average y of items (for sorting) */
    y: number
    minX: number
    maxX: number
    minY: number
    maxY: number
    avgHeight: number
  }

  // ── Spatial grouping helpers ────────────────────────────────

  const LINE_GAP = 4          // px – items within this y-distance form one line
  const PARA_GAP_FACTOR = 1.6 // gap > avgLineHeight × factor → new paragraph

  /**
   * Group text items into horizontal lines by y-proximity.
   */
  function groupIntoLines(items: RenderedTextItem[]): TextLine[] {
    if (items.length === 0) return []

    // Sort by y then x
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
    const lines: TextLine[] = []

    for (const item of sorted) {
      let added = false
      for (const line of lines) {
        if (Math.abs(item.y - line.y) <= LINE_GAP) {
          line.items.push(item)
          line.minX = Math.min(line.minX, item.x)
          line.maxX = Math.max(line.maxX, item.x + item.width)
          line.minY = Math.min(line.minY, item.y)
          line.maxY = Math.max(line.maxY, item.y + item.height)
          line.y =
            line.items.reduce((s, i) => s + i.y, 0) / line.items.length
          line.avgHeight =
            line.items.reduce((s, i) => s + i.height, 0) / line.items.length
          added = true
          break
        }
      }
      if (!added) {
        lines.push({
          items: [item],
          y: item.y,
          minX: item.x,
          maxX: item.x + item.width,
          minY: item.y,
          maxY: item.y + item.height,
          avgHeight: item.height,
        })
      }
    }

    lines.sort((a, b) => a.y - b.y)
    return lines
  }

  /**
   * Group consecutive lines into paragraphs by vertical gap.
   */
  function groupIntoParagraphs(lines: TextLine[]): TextLine[][] {
    if (lines.length === 0) return []

    const avgLineH =
      lines.reduce((s, l) => s + l.avgHeight, 0) / lines.length
    const threshold = Math.max(avgLineH * PARA_GAP_FACTOR, 8)

    const groups: TextLine[][] = []
    let cur: TextLine[] = [lines[0]!]

    for (let i = 1; i < lines.length; i++) {
      const prev = cur[cur.length - 1]!
      const next = lines[i]!
      const gap = next.minY - prev.maxY

      if (gap > threshold) {
        groups.push(cur)
        cur = [next]
      } else {
        cur.push(next)
      }
    }
    if (cur.length > 0) groups.push(cur)
    return groups
  }

  // ── Public API ─────────────────────────────────────────────

  /**
   * Extract text from a single page, grouped into paragraphs with
   * accurate bounding rects derived from the constituent text items.
   */
  async function extractPageText(pageIndex: number): Promise<PdfParagraph[]> {
    const pdf = pdfDoc.value
    if (!pdf) throw new Error('No PDF document loaded. Call loadDocument() first.')

    try {
      const textItems = await getTextContent(pdf, pageIndex)
      if (textItems.length === 0) return []

      const lines = groupIntoLines(textItems)
      const groups = groupIntoParagraphs(lines)

      const paragraphs: PdfParagraph[] = []
      let idx = 0

      for (const group of groups) {
        // Build text: sort items within each line by x, join with spaces
        const lineTexts: string[] = []
        for (const line of group) {
          const sorted = [...line.items].sort((a, b) => a.x - b.x)
          lineTexts.push(sorted.map((i) => i.text).join(' '))
        }
        const text = lineTexts.join(' ').replace(/\s+/g, ' ').trim()

        if (!isValidParagraph(text)) continue

        // Union bounding rect
        const minX = Math.min(...group.map((l) => l.minX))
        const minY = Math.min(...group.map((l) => l.minY))
        const maxX = Math.max(...group.map((l) => l.maxX))
        const maxY = Math.max(...group.map((l) => l.maxY))

        const boundingRect: BoundingRect = {
          top: minY,
          left: minX,
          width: maxX - minX,
          height: maxY - minY,
        }

        const { cleanText, formulas } = protectFormulas(text)

        paragraphs.push({
          index: idx,
          pageIndex,
          text,
          boundingRect,
          formulas: formulas.map((f) => ({
            placeholder: f.placeholder,
            original: f.original,
          })),
          cleanText,
        })
        idx++
      }

      return paragraphs
    } catch (err) {
      console.error(
        `[usePdfTextExtractor] Failed to extract page ${pageIndex}:`,
        err,
      )
      return []
    }
  }

  /**
   * Extract text from all pages, returning a flat array of paragraphs.
   */
  async function extractAllText(): Promise<PdfParagraph[]> {
    const pdf = pdfDoc.value
    if (!pdf) throw new Error('No PDF document loaded. Call loadDocument() first.')

    const allParagraphs: PdfParagraph[] = []

    for (let i = 0; i < pdf.numPages; i++) {
      try {
        const pageParagraphs = await extractPageText(i)
        // Re-index globally
        for (const p of pageParagraphs) {
          p.index = allParagraphs.length
          allParagraphs.push(p)
        }
      } catch (err) {
        console.error(
          `[usePdfTextExtractor] Skipping page ${i} due to error:`,
          err,
        )
      }
    }

    return allParagraphs
  }

  /**
   * Extract document context: title and abstract from page 0.
   */
  async function extractContext(): Promise<{ title: string; abstract: string }> {
    const pdf = pdfDoc.value
    if (!pdf) throw new Error('No PDF document loaded. Call loadDocument() first.')

    let title = ''
    let abstract = ''

    try {
      const textItems = await getTextContent(pdf, 0)
      if (textItems.length === 0) return { title, abstract }

      // Build full page text with line structure
      const lines: string[] = []
      let currentLine = ''
      let lastY = -1
      const GAP = 4

      for (const item of textItems) {
        if (lastY >= 0 && Math.abs(item.y - lastY) > GAP) {
          if (currentLine.trim()) lines.push(currentLine.trim())
          currentLine = ''
        }
        currentLine += (currentLine ? ' ' : '') + item.text
        lastY = item.y
      }
      if (currentLine.trim()) lines.push(currentLine.trim())

      // Title: first significant text
      for (const line of lines) {
        if (line.length >= 5 && !/^\d+$/.test(line)) {
          title = line
          break
        }
      }

      // Abstract
      const fullText = lines.join('\n')
      const abstractMatch = fullText.match(
        /\bAbstract\b[:\s.\-—]*\n?([\s\S]*?)(?:\n(?:1\s|I\s|Introduction|Keywords|1\.|I\.)\b|$)/i,
      )
      if (abstractMatch?.[1]) {
        abstract = abstractMatch[1]
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }
    } catch (err) {
      console.error('[usePdfTextExtractor] Failed to extract context:', err)
    }

    return { title, abstract }
  }

  return {
    pdfDoc,
    pageCount,
    loadDocument,
    extractPageText,
    extractAllText,
    extractContext,
  }
}
