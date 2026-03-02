import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GlossaryEntry } from '@/types/settings'
import { getDB } from '@/services/indexeddb'

export const useGlossaryStore = defineStore('glossary', () => {
  const entries = ref<GlossaryEntry[]>([])
  const isLoading = ref(false)

  const glossaryMap = computed(() => {
    const map: Record<string, string> = {}
    for (const entry of entries.value) {
      map[entry.english] = entry.chinese
    }
    return map
  })

  const sortedEntries = computed(() =>
    [...entries.value].sort((a, b) => a.english.localeCompare(b.english))
  )

  async function loadEntries() {
    isLoading.value = true
    try {
      const db = await getDB()
      entries.value = await db.getAll('glossary')
    } catch (e) {
      console.error('Failed to load glossary:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function addEntry(english: string, chinese: string) {
    const entry: GlossaryEntry = {
      id: crypto.randomUUID(),
      english: english.trim(),
      chinese: chinese.trim(),
      createdAt: Date.now(),
    }
    try {
      const db = await getDB()
      await db.put('glossary', entry)
      entries.value.push(entry)
    } catch (e) {
      console.error('Failed to add glossary entry:', e)
    }
  }

  async function updateEntry(id: string, english: string, chinese: string) {
    try {
      const db = await getDB()
      const entry = await db.get('glossary', id)
      if (entry) {
        entry.english = english.trim()
        entry.chinese = chinese.trim()
        await db.put('glossary', entry)
        const idx = entries.value.findIndex(e => e.id === id)
        if (idx >= 0) {
          entries.value[idx] = entry
        }
      }
    } catch (e) {
      console.error('Failed to update glossary entry:', e)
    }
  }

  async function deleteEntry(id: string) {
    try {
      const db = await getDB()
      await db.delete('glossary', id)
      entries.value = entries.value.filter(e => e.id !== id)
    } catch (e) {
      console.error('Failed to delete glossary entry:', e)
    }
  }

  async function importCSV(csvText: string) {
    const lines = csvText.split('\n').filter(l => l.trim())
    const newEntries: GlossaryEntry[] = []
    for (const line of lines) {
      const [english, chinese] = line.split(',').map(s => s.trim())
      if (english && chinese) {
        newEntries.push({
          id: crypto.randomUUID(),
          english,
          chinese,
          createdAt: Date.now(),
        })
      }
    }
    if (newEntries.length > 0) {
      try {
        const db = await getDB()
        const tx = db.transaction('glossary', 'readwrite')
        await Promise.all(newEntries.map(e => tx.store.put(e)))
        await tx.done
        entries.value.push(...newEntries)
      } catch (e) {
        console.error('Failed to import CSV:', e)
      }
    }
    return newEntries.length
  }

  function exportCSV(): string {
    return entries.value
      .map(e => `${e.english},${e.chinese}`)
      .join('\n')
  }

  async function clearAll() {
    try {
      const db = await getDB()
      await db.clear('glossary')
      entries.value = []
    } catch (e) {
      console.error('Failed to clear glossary:', e)
    }
  }

  return {
    entries,
    isLoading,
    glossaryMap,
    sortedEntries,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    importCSV,
    exportCSV,
    clearAll,
  }
})
