import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TranslationRecord } from '@/types/settings'
import { getDB } from '@/services/indexeddb'

export const useHistoryStore = defineStore('history', () => {
  const records = ref<TranslationRecord[]>([])
  const isLoading = ref(false)
  const activeDocumentId = ref<string | null>(null)

  const sortedRecords = computed(() =>
    [...records.value].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
  )

  const totalCacheSize = computed(() =>
    records.value.reduce((sum, r) => sum + r.cacheSize, 0)
  )

  async function loadRecords() {
    isLoading.value = true
    try {
      const db = await getDB()
      records.value = await db.getAll('translations')
    } catch (e) {
      console.error('Failed to load history:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function saveRecord(record: TranslationRecord) {
    try {
      const db = await getDB()
      await db.put('translations', record)
      const idx = records.value.findIndex(r => r.id === record.id)
      if (idx >= 0) {
        records.value[idx] = record
      } else {
        records.value.push(record)
      }
    } catch (e) {
      console.error('Failed to save record:', e)
    }
  }

  async function deleteRecord(id: string) {
    if (id === activeDocumentId.value) return
    try {
      const db = await getDB()
      await db.delete('translations', id)
      records.value = records.value.filter(r => r.id !== id)
    } catch (e) {
      console.error('Failed to delete record:', e)
    }
  }

  async function deleteRecords(ids: string[]) {
    const safeIds = ids.filter(id => id !== activeDocumentId.value)
    try {
      const db = await getDB()
      const tx = db.transaction('translations', 'readwrite')
      await Promise.all(safeIds.map(id => tx.store.delete(id)))
      await tx.done
      records.value = records.value.filter(r => !safeIds.includes(r.id))
    } catch (e) {
      console.error('Failed to delete records:', e)
    }
  }

  async function clearAll() {
    try {
      const db = await getDB()
      const tx = db.transaction('translations', 'readwrite')
      const allKeys = await tx.store.getAllKeys()
      const keysToDelete = allKeys.filter(k => String(k) !== activeDocumentId.value)
      await Promise.all(keysToDelete.map(k => tx.store.delete(k)))
      await tx.done
      records.value = records.value.filter(r => r.id === activeDocumentId.value)
    } catch (e) {
      console.error('Failed to clear history:', e)
    }
  }

  function setActiveDocument(id: string | null) {
    activeDocumentId.value = id
  }

  async function getRecord(id: string): Promise<TranslationRecord | undefined> {
    try {
      const db = await getDB()
      return await db.get('translations', id)
    } catch {
      return undefined
    }
  }

  async function updateReadingProgress(id: string, page: number, scrollTop: number) {
    try {
      const db = await getDB()
      const record = await db.get('translations', id)
      if (record) {
        record.readingProgress = { page, scrollTop }
        record.lastOpenedAt = Date.now()
        await db.put('translations', record)
        const idx = records.value.findIndex(r => r.id === id)
        if (idx >= 0) {
          records.value[idx] = record
        }
      }
    } catch (e) {
      console.error('Failed to update reading progress:', e)
    }
  }

  return {
    records,
    isLoading,
    activeDocumentId,
    sortedRecords,
    totalCacheSize,
    loadRecords,
    saveRecord,
    deleteRecord,
    deleteRecords,
    clearAll,
    setActiveDocument,
    getRecord,
    updateReadingProgress,
  }
})
