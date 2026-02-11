import { toast } from 'vue-sonner'

const notification = {
  name: 'notify',
  noticeCache: {},
  clear() {
    toast.dismiss()
    this.noticeCache = {}
  },
  notify({
    time = 10000,
    title = '',
    message = '',
    type = 'primary', // primary, error, warning or info
    showConfirm = false
  }) {
    return new Promise((resolve, reject) => {
      const options = {
        description: title && message ? message : undefined,
        duration: showConfirm ? Infinity : time
      }

      if (showConfirm) {
        options.action = {
          label: 'OK',
          onClick: () => resolve()
        }
        options.onDismiss = () => reject(new Error('dismissed'))
      }

      const label = title || message

      if (type === 'error') {
        toast.error(label, options)
      } else if (type === 'warning') {
        toast.warning(label, options)
      } else if (type === 'info') {
        toast.info(label, options)
      } else {
        toast(label, options)
      }

      // For non-confirm toasts, resolve immediately
      if (!showConfirm) {
        resolve()
      }
    })
  }
}

export default notification
