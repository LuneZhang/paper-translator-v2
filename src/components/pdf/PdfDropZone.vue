<script setup lang="ts">
/**
 * PdfDropZone — Global drag-and-drop overlay for PDF file import.
 *
 * Listens on the window for drag events. When a file is dragged over,
 * displays a full-screen overlay prompting the user to drop the file.
 * Validates file type (.pdf) and size (< 100 MB).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB

const emit = defineEmits<{
  'file-dropped': [file: File]
  'file-error': [message: string]
}>()

const isDragOver = ref(false)

// Track enter/leave depth so nested elements don't flicker the overlay
let dragDepth = 0

function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragDepth++
  if (dragDepth === 1) {
    isDragOver.value = true
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  // Required to allow drop
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragDepth--
  if (dragDepth <= 0) {
    dragDepth = 0
    isDragOver.value = false
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragDepth = 0
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (!files || files.length === 0) return

  const file = files[0]!

  // Validate file type
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    emit('file-error', '仅支持 PDF 文件格式')
    return
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    emit('file-error', `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024} MB`)
    return
  }

  emit('file-dropped', file)
}

onMounted(() => {
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
})

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
})
</script>

<template>
  <Transition name="fade">
    <div
      v-if="isDragOver"
      class="fixed inset-0 z-40 flex items-center justify-center"
      style="background: var(--color-overlay)"
    >
      <div
        class="drop-active flex flex-col items-center justify-center gap-4 rounded-2xl border-[3px] border-dashed px-16 py-14"
        style="
          border-color: var(--color-accent);
          background: var(--color-bg-secondary);
        "
      >
        <!-- Upload icon -->
        <svg
          class="h-12 w-12"
          style="color: var(--color-accent)"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>

        <span
          class="text-lg font-medium select-none"
          style="color: var(--color-text-primary)"
        >
          释放以打开 PDF
        </span>

        <span
          class="text-sm select-none"
          style="color: var(--color-text-tertiary)"
        >
          支持 .pdf 格式，最大 100 MB
        </span>
      </div>
    </div>
  </Transition>
</template>
