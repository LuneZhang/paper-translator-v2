/** 设置相关类型 */

/** 主题模式 */
export type ThemeMode = 'light' | 'dark' | 'system'

/** 用户设置 */
export interface UserSettings {
  /** Gemini API Key */
  apiKey: string
  /** 当前翻译引擎 */
  engine: TranslationEngine
  /** 主题模式 */
  theme: ThemeMode
  /** 译文字号 (px) */
  fontSize: number
  /** 是否启用同步滚动 */
  syncScroll: boolean
  /** 是否已完成首次引导 */
  setupCompleted: boolean
}

/** 翻译历史记录 */
export interface TranslationRecord {
  /** 文件 SHA-256 哈希 */
  id: string
  /** 原始文件名 */
  fileName: string
  /** 文件大小（字节） */
  fileSize: number
  /** 总页数 */
  totalPages: number
  /** 翻译时间戳 */
  translatedAt: number
  /** 上次打开时间戳 */
  lastOpenedAt: number
  /** 阅读进度 */
  readingProgress: {
    page: number
    scrollTop: number
  }
  /** 翻译结果 */
  paragraphs: import('./translation').TranslatedParagraph[]
  /** 论文上下文 */
  context: {
    title: string
    abstract: string
  }
  /** 缓存占用大小（字节） */
  cacheSize: number
}

/** 术语表条目 */
export interface GlossaryEntry {
  id: string
  english: string
  chinese: string
  createdAt: number
}

import type { TranslationEngine } from './translation'
