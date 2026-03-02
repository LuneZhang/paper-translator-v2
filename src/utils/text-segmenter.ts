/**
 * 文本分段工具
 * 将 PDF 提取的文本按段落切分
 */

/**
 * 将连续文本切分为段落
 * 规则：
 * 1. 双换行符分隔的块视为独立段落
 * 2. 单独的短行（可能是标题）视为独立段落
 * 3. 合并因 PDF 换行而断开的同一段落
 */
export function segmentText(rawText: string): string[] {
  if (!rawText.trim()) return []

  // 先按双换行分割
  const blocks = rawText.split(/\n\s*\n/)
  const paragraphs: string[] = []

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // 将 PDF 换行（行末非句末的换行）合并为空格
    const merged = trimmed
      .replace(/([a-zA-Z,;])\s*\n\s*([a-z])/g, '$1 $2')  // 英文行内换行合并
      .replace(/\n/g, ' ')  // 剩余换行替换为空格
      .replace(/\s+/g, ' ') // 合并多余空格
      .trim()

    if (merged) {
      paragraphs.push(merged)
    }
  }

  return paragraphs
}

/**
 * 判断一段文本是否为"有意义的段落"（排除页眉页脚等噪声）
 */
export function isValidParagraph(text: string): boolean {
  const trimmed = text.trim()
  // 过短的文本
  if (trimmed.length < 5) return false
  // 纯数字（页码）
  if (/^\d+$/.test(trimmed)) return false
  // 纯标点
  if (/^[.,;:!?'"()\[\]{}\-–—]+$/.test(trimmed)) return false
  return true
}
