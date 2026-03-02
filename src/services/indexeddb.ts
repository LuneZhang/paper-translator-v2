import { openDB, type IDBPDatabase } from 'idb'

interface PaperTranslatorDB {
  translations: {
    key: string
    value: import('@/types/settings').TranslationRecord
  }
  glossary: {
    key: string
    value: import('@/types/settings').GlossaryEntry
  }
}

let dbPromise: Promise<IDBPDatabase<PaperTranslatorDB>> | null = null

export function getDB(): Promise<IDBPDatabase<PaperTranslatorDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PaperTranslatorDB>('PaperTranslatorDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('translations')) {
          db.createObjectStore('translations', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('glossary')) {
          db.createObjectStore('glossary', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}
