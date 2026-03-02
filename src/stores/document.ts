import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PdfParagraph, PdfMetadata } from '@/types/pdf'

export const useDocumentStore = defineStore('document', () => {
  // State
  const pdfFile = ref<File | null>(null)
  const pdfData = ref<ArrayBuffer | null>(null)
  const fileHash = ref<string>('')
  const metadata = ref<PdfMetadata | null>(null)
  const paragraphs = ref<PdfParagraph[]>([])
  const currentPage = ref(0)
  const totalPages = ref(0)
  const scale = ref(1.5)
  const isLoading = ref(false)
  const isActive = ref(false)

  // Computed
  const hasDocument = computed(() => pdfData.value !== null)
  const fileName = computed(() => metadata.value?.fileName ?? '')
  const pageProgress = computed(() =>
    totalPages.value > 0 ? `${currentPage.value + 1} / ${totalPages.value}` : ''
  )

  // Actions
  function setDocument(file: File, data: ArrayBuffer, hash: string) {
    pdfFile.value = file
    pdfData.value = data
    fileHash.value = hash
    isActive.value = true
    metadata.value = {
      title: file.name.replace(/\.pdf$/i, ''),
      author: '',
      pageCount: 0,
      fileSize: file.size,
      fileName: file.name,
    }
  }

  function setMetadata(meta: Partial<PdfMetadata>) {
    if (metadata.value) {
      metadata.value = { ...metadata.value, ...meta }
    }
  }

  function setTotalPages(count: number) {
    totalPages.value = count
    if (metadata.value) {
      metadata.value.pageCount = count
    }
  }

  function setCurrentPage(page: number) {
    currentPage.value = Math.max(0, Math.min(page, totalPages.value - 1))
  }

  function setScale(newScale: number) {
    scale.value = Math.max(0.5, Math.min(3, newScale))
  }

  function setParagraphs(paras: PdfParagraph[]) {
    paragraphs.value = paras
  }

  function addParagraphs(paras: PdfParagraph[]) {
    paragraphs.value.push(...paras)
  }

  function clearDocument() {
    pdfFile.value = null
    pdfData.value = null
    fileHash.value = ''
    metadata.value = null
    paragraphs.value = []
    currentPage.value = 0
    totalPages.value = 0
    isLoading.value = false
    isActive.value = false
  }

  return {
    pdfFile,
    pdfData,
    fileHash,
    metadata,
    paragraphs,
    currentPage,
    totalPages,
    scale,
    isLoading,
    isActive,
    hasDocument,
    fileName,
    pageProgress,
    setDocument,
    setMetadata,
    setTotalPages,
    setCurrentPage,
    setScale,
    setParagraphs,
    addParagraphs,
    clearDocument,
  }
})
