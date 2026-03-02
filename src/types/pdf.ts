/** PDF 文档相关类型 */

/** PDF 页面中提取的段落信息 */
export interface PdfParagraph {
  /** 段落在页面中的索引 */
  index: number
  /** 所在页码（0-based） */
  pageIndex: number
  /** 段落原始文本 */
  text: string
  /** 段落在 PDF 页面中的边界框 */
  boundingRect: BoundingRect
  /** 段落中包含的公式占位符映射 */
  formulas: FormulaMapping[]
  /** 去除公式后的纯文本（用于发送翻译） */
  cleanText: string
}

/** 边界框 */
export interface BoundingRect {
  top: number
  left: number
  width: number
  height: number
}

/** 公式占位符映射 */
export interface FormulaMapping {
  /** 占位符标记，如 <formula_0> */
  placeholder: string
  /** 原始公式文本 */
  original: string
}

/** PDF 文档元数据 */
export interface PdfMetadata {
  title: string
  author: string
  pageCount: number
  fileSize: number
  fileName: string
}

/** PDF 页面渲染信息 */
export interface PdfPageInfo {
  pageIndex: number
  width: number
  height: number
  rendered: boolean
}
