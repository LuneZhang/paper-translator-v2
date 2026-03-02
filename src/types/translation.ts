/** 翻译相关类型 */

/** 翻译引擎类型 */
export type TranslationEngine = 'gemini-flash' | 'gemini-flash-lite' | 'google-translate'

/** 翻译状态 */
export type TranslationStatus = 'idle' | 'extracting' | 'translating' | 'paused' | 'completed' | 'error'

/** 翻译请求 */
export interface TranslationRequest {
  text: string
  context: { title?: string; abstract?: string }
  glossary: Record<string, string>
  engine: TranslationEngine
  apiKey: string
}

/** 翻译响应 */
export interface TranslationResponse {
  translation: string
  engine: TranslationEngine
  quota: QuotaInfo
}

/** 配额信息 */
export interface QuotaInfo {
  flash: QuotaDetail
  flashLite: QuotaDetail
}

/** 配额详情 */
export interface QuotaDetail {
  used: number
  limit: number
  resetAt: string
}

/** 已翻译的段落 */
export interface TranslatedParagraph {
  /** 段落唯一标识 (pageIndex-paragraphIndex) */
  id: string
  /** 所在页码 (0-based) */
  pageIndex: number
  /** 段落在页面中的索引 */
  paragraphIndex: number
  /** 原始文本 */
  originalText: string
  /** 翻译后的文本 */
  translatedText: string
  /** 公式映射 */
  formulas: Array<{ placeholder: string; original: string }>
  /** 在 PDF 页面中的位置 */
  boundingRect: {
    top: number
    left: number
    width: number
    height: number
  }
  /** 翻译状态 */
  status: 'pending' | 'translating' | 'completed' | 'error'
}

/** 翻译进度 */
export interface TranslationProgress {
  /** 已翻译段落数 */
  translated: number
  /** 总段落数 */
  total: number
  /** 当前正在翻译的页码 */
  currentPage: number
  /** 总页数 */
  totalPages: number
}
