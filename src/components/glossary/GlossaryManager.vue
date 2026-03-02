<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGlossaryStore } from '@/stores/glossary'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const glossaryStore = useGlossaryStore()
const toast = useToast()

// Add form
const newEnglish = ref('')
const newChinese = ref('')

// Search
const searchQuery = ref('')

// Edit state
const editingId = ref<string | null>(null)
const editEnglish = ref('')
const editChinese = ref('')

// File input ref
const fileInputRef = ref<HTMLInputElement | null>(null)

const filteredEntries = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return glossaryStore.sortedEntries
  return glossaryStore.sortedEntries.filter(
    e => e.english.toLowerCase().includes(q) || e.chinese.includes(q)
  )
})

function handleBackdropClick() {
  emit('close')
}

async function handleAdd() {
  const en = newEnglish.value.trim()
  const zh = newChinese.value.trim()
  if (!en || !zh) return
  await glossaryStore.addEntry(en, zh)
  newEnglish.value = ''
  newChinese.value = ''
}

function startEdit(id: string, english: string, chinese: string) {
  editingId.value = id
  editEnglish.value = english
  editChinese.value = chinese
}

async function saveEdit(id: string) {
  const en = editEnglish.value.trim()
  const zh = editChinese.value.trim()
  if (!en || !zh) return
  await glossaryStore.updateEntry(id, en, zh)
  editingId.value = null
}

function cancelEdit() {
  editingId.value = null
}

async function handleDelete(id: string) {
  await glossaryStore.deleteEntry(id)
  if (editingId.value === id) {
    editingId.value = null
  }
}

function triggerImport() {
  fileInputRef.value?.click()
}

async function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const text = await file.text()
  const count = await glossaryStore.importCSV(text)
  toast.success(`成功导入 ${count} 条术语`)
  input.value = ''
}

function handleExport() {
  const csv = glossaryStore.exportCSV()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'glossary.csv'
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(() => {
  glossaryStore.loadEntries()
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="props.show"
        class="fixed inset-0 z-30"
        style="background: var(--color-overlay)"
        @click="handleBackdropClick"
      />
    </Transition>

    <!-- Panel -->
    <Transition name="slide-right">
      <div
        v-if="props.show"
        class="fixed top-0 right-0 bottom-0 z-30 flex flex-col"
        style="
          width: 420px;
          max-width: 100vw;
          background: var(--color-bg-primary);
          border-left: 1px solid var(--color-border);
          box-shadow: var(--shadow-xl);
        "
      >
        <!-- Header -->
        <div
          class="px-5 py-4 flex-shrink-0"
          style="border-bottom: 1px solid var(--color-border)"
        >
          <div class="flex items-center justify-between">
            <h2 class="text-base font-semibold" style="color: var(--color-text-primary)">
              术语表
            </h2>
            <button
              class="p-1.5 rounded-lg transition-colors cursor-pointer"
              style="color: var(--color-text-secondary)"
              @mouseenter="($event.target as HTMLElement).style.background = 'var(--color-bg-tertiary)'"
              @mouseleave="($event.target as HTMLElement).style.background = 'transparent'"
              @click="emit('close')"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p class="text-xs mt-1" style="color: var(--color-text-tertiary)">
            自定义学术术语翻译对照，确保翻译一致性
          </p>
        </div>

        <!-- Add form -->
        <div
          class="px-5 py-3 flex-shrink-0"
          style="border-bottom: 1px solid var(--color-border)"
        >
          <form class="flex items-center gap-2" @submit.prevent="handleAdd">
            <input
              v-model="newEnglish"
              type="text"
              placeholder="English Term"
              class="flex-1 px-3 py-1.5 text-sm rounded-lg outline-none"
              style="
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                color: var(--color-text-primary);
              "
              @focus="($event.target as HTMLElement).style.borderColor = 'var(--color-accent)'"
              @blur="($event.target as HTMLElement).style.borderColor = 'var(--color-border)'"
            />
            <input
              v-model="newChinese"
              type="text"
              placeholder="中文翻译"
              class="flex-1 px-3 py-1.5 text-sm rounded-lg outline-none"
              style="
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                color: var(--color-text-primary);
              "
              @focus="($event.target as HTMLElement).style.borderColor = 'var(--color-accent)'"
              @blur="($event.target as HTMLElement).style.borderColor = 'var(--color-border)'"
            />
            <button
              type="submit"
              class="px-3 py-1.5 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
              :style="{
                background: newEnglish.trim() && newChinese.trim() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                color: newEnglish.trim() && newChinese.trim() ? 'white' : 'var(--color-text-tertiary)',
                cursor: newEnglish.trim() && newChinese.trim() ? 'pointer' : 'not-allowed',
              }"
              :disabled="!newEnglish.trim() || !newChinese.trim()"
            >
              添加
            </button>
          </form>
        </div>

        <!-- Search -->
        <div
          class="px-5 py-2.5 flex-shrink-0"
          style="border-bottom: 1px solid var(--color-border)"
        >
          <div class="relative">
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="color: var(--color-text-tertiary)"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索术语..."
              class="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg outline-none"
              style="
                background: var(--color-bg-secondary);
                border: 1px solid var(--color-border);
                color: var(--color-text-primary);
              "
              @focus="($event.target as HTMLElement).style.borderColor = 'var(--color-accent)'"
              @blur="($event.target as HTMLElement).style.borderColor = 'var(--color-border)'"
            />
          </div>
        </div>

        <!-- Entries list -->
        <div class="flex-1 overflow-y-auto">
          <div
            v-if="filteredEntries.length === 0"
            class="flex items-center justify-center h-full"
          >
            <p class="text-sm" style="color: var(--color-text-tertiary)">
              {{ glossaryStore.sortedEntries.length === 0
                ? '暂无术语，添加术语以提升翻译准确性'
                : '无匹配结果'
              }}
            </p>
          </div>

          <div v-else class="py-1">
            <div
              v-for="entry in filteredEntries"
              :key="entry.id"
              class="group px-5 py-2.5 transition-colors"
              @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--color-bg-tertiary)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
            >
              <!-- Edit mode -->
              <template v-if="editingId === entry.id">
                <div class="flex items-center gap-2">
                  <input
                    v-model="editEnglish"
                    type="text"
                    class="flex-1 px-2.5 py-1 text-sm rounded-md outline-none"
                    style="
                      background: var(--color-bg-secondary);
                      border: 1px solid var(--color-accent);
                      color: var(--color-text-primary);
                    "
                    @keyup.enter="saveEdit(entry.id)"
                    @keyup.escape="cancelEdit"
                  />
                  <input
                    v-model="editChinese"
                    type="text"
                    class="flex-1 px-2.5 py-1 text-sm rounded-md outline-none"
                    style="
                      background: var(--color-bg-secondary);
                      border: 1px solid var(--color-accent);
                      color: var(--color-text-primary);
                    "
                    @keyup.enter="saveEdit(entry.id)"
                    @keyup.escape="cancelEdit"
                  />
                  <button
                    class="p-1 rounded-md transition-colors cursor-pointer"
                    style="color: var(--color-success)"
                    @click="saveEdit(entry.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    class="p-1 rounded-md transition-colors cursor-pointer"
                    style="color: var(--color-text-tertiary)"
                    @click="cancelEdit"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </template>

              <!-- Display mode -->
              <template v-else>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium" style="color: var(--color-text-primary)">
                    {{ entry.english }}
                  </span>
                  <svg
                    class="flex-shrink-0"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="color: var(--color-text-tertiary)"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                  <span class="text-sm" style="color: var(--color-text-secondary)">
                    {{ entry.chinese }}
                  </span>

                  <span class="flex-1" />

                  <!-- Action buttons (visible on hover via opacity) -->
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      class="p-1 rounded-md transition-colors cursor-pointer"
                      style="color: var(--color-text-tertiary)"
                      @mouseenter="($event.currentTarget as HTMLElement).style.color = 'var(--color-accent)'"
                      @mouseleave="($event.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'"
                      @click="startEdit(entry.id, entry.english, entry.chinese)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      class="p-1 rounded-md transition-colors cursor-pointer"
                      style="color: var(--color-text-tertiary)"
                      @mouseenter="($event.currentTarget as HTMLElement).style.color = 'var(--color-error)'"
                      @mouseleave="($event.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'"
                      @click="handleDelete(entry.id)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Bottom bar -->
        <div
          class="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style="border-top: 1px solid var(--color-border)"
        >
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer"
              style="
                background: transparent;
                border: 1px solid var(--color-border);
                color: var(--color-text-secondary);
              "
              @mouseenter="($event.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'"
              @click="triggerImport"
            >
              导入 CSV
            </button>
            <button
              class="px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer"
              style="
                background: transparent;
                border: 1px solid var(--color-border);
                color: var(--color-text-secondary);
              "
              @mouseenter="($event.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'"
              @mouseleave="($event.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'"
              @click="handleExport"
            >
              导出 CSV
            </button>
          </div>
          <span class="text-xs" style="color: var(--color-text-tertiary)">
            共 {{ glossaryStore.entries.length }} 条术语
          </span>
        </div>

        <!-- Hidden file input -->
        <input
          ref="fileInputRef"
          type="file"
          accept=".csv"
          class="hidden"
          @change="handleFileImport"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-right-leave-active {
  transition: transform 0.2s ease-in;
}
.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

/* Tailwind group-hover doesn't work with scoped styles in all setups,
   so we add a CSS fallback */
.group:hover .group-hover\:opacity-100 {
  opacity: 1;
}
</style>
