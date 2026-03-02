<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHistoryStore } from '@/stores/history'
import { formatFileSize, truncateFileName } from '@/utils/format'

const emit = defineEmits<{
  close: []
}>()

const historyStore = useHistoryStore()
const selectedIds = ref<Set<string>>(new Set())

const selectableRecords = computed(() =>
  historyStore.sortedRecords.filter(r => r.id !== historyStore.activeDocumentId)
)

const allSelected = computed(() =>
  selectableRecords.value.length > 0 &&
  selectableRecords.value.every(r => selectedIds.value.has(r.id))
)

const selectedCount = computed(() => selectedIds.value.size)

function toggleSelect(id: string) {
  if (id === historyStore.activeDocumentId) return
  const next = new Set(selectedIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedIds.value = next
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(selectableRecords.value.map(r => r.id))
  }
}

async function deleteSingle(id: string) {
  if (id === historyStore.activeDocumentId) return
  selectedIds.value.delete(id)
  await historyStore.deleteRecord(id)
}

async function deleteSelected() {
  if (selectedCount.value === 0) return
  const ids = [...selectedIds.value]
  selectedIds.value = new Set()
  await historyStore.deleteRecords(ids)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div
      class="flex items-center justify-between px-5 py-3 flex-shrink-0"
      style="border-bottom: 1px solid var(--color-border)"
    >
      <h3 class="text-sm font-semibold" style="color: var(--color-text-primary)">
        缓存管理
      </h3>
      <button
        class="p-1 rounded-md transition-colors cursor-pointer"
        style="color: var(--color-text-secondary)"
        @mouseenter="($event.target as HTMLElement).style.background = 'var(--color-bg-tertiary)'"
        @mouseleave="($event.target as HTMLElement).style.background = 'transparent'"
        @click="emit('close')"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    <!-- Total size -->
    <div
      class="px-5 py-2.5 flex-shrink-0"
      style="border-bottom: 1px solid var(--color-border)"
    >
      <p class="text-xs" style="color: var(--color-text-tertiary)">
        占用空间: {{ formatFileSize(historyStore.totalCacheSize) }}
      </p>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto py-1">
      <div
        v-if="historyStore.sortedRecords.length === 0"
        class="flex items-center justify-center h-full"
      >
        <p class="text-sm" style="color: var(--color-text-tertiary)">暂无缓存记录</p>
      </div>

      <div
        v-for="record in historyStore.sortedRecords"
        :key="record.id"
        class="flex items-center gap-3 px-5 py-2.5 transition-colors"
        @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--color-bg-tertiary)'"
        @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
      >
        <!-- Checkbox -->
        <label class="flex-shrink-0 cursor-pointer">
          <input
            type="checkbox"
            class="sr-only"
            :checked="selectedIds.has(record.id)"
            :disabled="record.id === historyStore.activeDocumentId"
            @change="toggleSelect(record.id)"
          />
          <span
            class="w-4 h-4 rounded flex items-center justify-center transition-colors"
            :style="{
              border: '1.5px solid ' + (selectedIds.has(record.id) ? 'var(--color-accent)' : 'var(--color-border)'),
              background: selectedIds.has(record.id) ? 'var(--color-accent)' : 'transparent',
              opacity: record.id === historyStore.activeDocumentId ? '0.4' : '1',
              cursor: record.id === historyStore.activeDocumentId ? 'not-allowed' : 'pointer',
            }"
          >
            <svg
              v-if="selectedIds.has(record.id)"
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        </label>

        <!-- PDF icon -->
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
          style="color: #9ca3af"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>

        <!-- File info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span
              class="text-sm truncate block"
              style="color: var(--color-text-primary)"
            >
              {{ truncateFileName(record.fileName, 28) }}
            </span>
            <span
              v-if="record.id === historyStore.activeDocumentId"
              class="flex-shrink-0 text-xs px-1.5 rounded-full"
              style="
                background: var(--color-accent-light);
                color: var(--color-accent);
              "
            >
              使用中
            </span>
          </div>
          <p class="text-xs" style="color: var(--color-text-tertiary)">
            {{ formatFileSize(record.cacheSize) }}
          </p>
        </div>

        <!-- Delete button -->
        <button
          class="flex-shrink-0 p-1 rounded-md transition-colors cursor-pointer"
          :style="{
            color: 'var(--color-text-tertiary)',
            opacity: record.id === historyStore.activeDocumentId ? '0.4' : '1',
            cursor: record.id === historyStore.activeDocumentId ? 'not-allowed' : 'pointer',
          }"
          :disabled="record.id === historyStore.activeDocumentId"
          @mouseenter="record.id !== historyStore.activeDocumentId && (($event.target as HTMLElement).style.color = 'var(--color-error)')"
          @mouseleave="($event.target as HTMLElement).style.color = 'var(--color-text-tertiary)'"
          @click="deleteSingle(record.id)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Bottom action bar -->
    <div
      class="flex items-center justify-between px-5 py-3 flex-shrink-0"
      style="border-top: 1px solid var(--color-border)"
    >
      <div class="flex items-center gap-3">
        <button
          class="text-sm transition-colors cursor-pointer"
          style="color: var(--color-accent); background: none; border: none;"
          @click="toggleSelectAll"
        >
          {{ allSelected ? '取消全选' : '全选' }}
        </button>
        <span
          v-if="selectedCount > 0"
          class="text-xs"
          style="color: var(--color-text-tertiary)"
        >
          已选择 {{ selectedCount }} 项
        </span>
      </div>
      <button
        class="text-sm transition-colors cursor-pointer"
        :style="{
          color: selectedCount > 0 ? 'var(--color-error)' : 'var(--color-text-tertiary)',
          background: 'none',
          border: 'none',
          cursor: selectedCount > 0 ? 'pointer' : 'not-allowed',
          opacity: selectedCount > 0 ? '1' : '0.5',
        }"
        :disabled="selectedCount === 0"
        @click="deleteSelected"
      >
        删除选中 ({{ selectedCount }})
      </button>
    </div>
  </div>
</template>
