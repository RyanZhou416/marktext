/**
 * Programmatic confirm dialog API.
 * Uses a reactive singleton pattern — creates a hidden ConfirmDialog instance
 * on first use and reuses it for subsequent calls.
 */
import { createApp, h, reactive } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmText: 'OK',
  cancelText: 'Cancel'
})

let resolveCallback: ((value: boolean) => void) | null = null
let container: HTMLDivElement | null = null
let mounted = false

function finish(result: boolean) {
  state.open = false
  if (resolveCallback) {
    resolveCallback(result)
    resolveCallback = null
  }
}

/**
 * Show a confirmation dialog programmatically.
 * @returns Promise that resolves to true if user clicks OK, false if Cancel or Esc
 */
export function confirm(
  title: string,
  message: string,
  options?: { confirmText?: string; cancelText?: string }
): Promise<boolean> {
  state.title = title
  state.message = message
  state.confirmText = options?.confirmText ?? 'OK'
  state.cancelText = options?.cancelText ?? 'Cancel'
  state.open = true

  if (!mounted) {
    container = document.createElement('div')
    container.setAttribute('data-confirm-dialog-root', '')
    document.body.appendChild(container)

    const app = createApp({
      setup() {
        return () =>
          h(ConfirmDialog, {
            ...state,
            'onUpdate:open': (v: boolean) => {
              state.open = v
              if (!v) finish(false)
            },
            onConfirm: () => finish(true),
            onCancel: () => finish(false)
          })
      }
    })
    app.mount(container)
    mounted = true
  }

  return new Promise(resolve => {
    resolveCallback = resolve
  })
}
