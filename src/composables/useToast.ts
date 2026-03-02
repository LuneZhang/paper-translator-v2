import { ref } from 'vue'

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
}

const toasts = ref<ToastItem[]>([])

export function useToast() {
  function show(message: string, type: ToastItem['type'] = 'info', duration = 3000) {
    const id = crypto.randomUUID()
    const toast: ToastItem = { id, message, type, duration }
    toasts.value.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }

    return id
  }

  function remove(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function success(message: string, duration?: number) {
    return show(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    return show(message, 'error', duration ?? 5000)
  }

  function info(message: string, duration?: number) {
    return show(message, 'info', duration)
  }

  function warning(message: string, duration?: number) {
    return show(message, 'warning', duration ?? 4000)
  }

  return {
    toasts,
    show,
    remove,
    success,
    error,
    info,
    warning,
  }
}
