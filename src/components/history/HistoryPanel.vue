<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useHistoryStore } from '@/stores/history'
import { formatFileSize, formatRelativeTime, truncateFileName } from '@/utils/format'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import CacheManager from './CacheManager.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
  'open-record': [id: string]
}>()

const historyStore = useHistoryStore()
const showCacheManager = ref(false)
const showClearConfirm = ref(false)

function handleBackdropClick() {
  emit('close')
}

function handleOpenRecord(id: string) {
  emit('open-record', id)
}

async function handleClearAll() {
  await historyStore.clearAll()
  showClearConfirm.value = false
}

onMounted(() => {
  historyStore.loadRecords()
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
          width: 380px;
          max-width: 100vw;
          background: var(--color-bg-primary);
          border-left: 1px solid var(--color-border);
          box-shadow: var(--shadow-xl);
        "
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style="border-bottom: 1px solid var(--color-border)"
        >
          <h2 class="text-base font-semibold" style="color: var(--color-text-primary)">
            翻译历史
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

        <!-- Cache info + actions -->
        <div
          class="px-5 py-3 flex-shrink-0"
          style="border-bottom: 1px solid var(--color-border)"
        >
          <p class="text-xs mb-2" style="color: var(--color-text-tertiary)">
            缓存占用: {{ formatFileSize(historyStore.totalCacheSize) }}
          </p>
          <div class="flex items-center gap-3">
            <button
              class="text-sm transition-colors cursor-pointer"
              style="color: var(--color-accent); background: none; border: none;"
              @click="showCacheManager = !showCacheManager"
            >
              {{ showCacheManager ? '返回列表' : '管理缓存' }}
            </button>
            <button
              class="text-sm transition-colors cursor-pointer"
              style="color: var(--color-error); background: none; border: none;"
              @click="showClearConfirm = true"
            >
              清空全部
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto">
          <!-- Cache Manager (inline) -->
          <CacheManager
            v-if="showCacheManager"
            @close="showCacheManager = false"
          />

          <!-- History list -->
          <template v-else>
            <div
              v-if="historyStore.sortedRecords.length === 0"
              class="flex items-center justify-center h-full"
            >
              <p class="text-sm" style="color: var(--color-text-tertiary)">
                暂无翻译记录
              </p>
            </div>

            <div v-else class="py-1">
              <button
                v-for="record in historyStore.sortedRecords"
                :key="record.id"
                class="w-full text-left px-5 py-3 transition-colors cursor-pointer flex items-start gap-3"
                style="background: transparent; border: none;"
                @mouseenter="($event.currentTarget as HTMLElement).style.background = 'var(--color-bg-tertiary)'"
                @mouseleave="($event.currentTarget as HTMLElement).style.background = 'transparent'"
                @click="handleOpenRecord(record.id)"
              >
                <!-- PDF icon -->
                <svg
                  class="flex-shrink-0 mt-0.5"
                  width="16"
                  height="16"
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
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-sm font-medium truncate block"
                      style="color: var(--color-text-primary)"
                    >
                      {{ truncateFileName(record.fileName) }}
                    </span>
                    <span
                      v-if="record.id === historyStore.activeDocumentId"
                      class="flex-shrink-0 text-xs px-2 rounded-full"
                      style="
                        background: var(--color-accent-light);
                        color: var(--color-accent);
                      "
                    >
                      使用中
                    </span>
                  </div>
                  <p class="text-xs mt-0.5" style="color: var(--color-text-tertiary)">
                    {{ formatFileSize(record.fileSize) }}
                    · {{ formatRelativeTime(record.lastOpenedAt) }}
                    · {{ record.totalPages }}页
                  </p>
                </div>
              </button>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Clear all confirm dialog -->
  <ConfirmDialog
    :show="showClearConfirm"
    title="清空翻译历史"
    message="确定清空所有翻译历史？当前正在使用的文档不会被删除。"
    confirm-text="清空"
    :danger="true"
    @confirm="handleClearAll"
    @cancel="showClearConfirm = false"
  />
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
</style>
