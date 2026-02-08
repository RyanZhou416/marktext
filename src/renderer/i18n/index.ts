import { createI18n } from 'vue-i18n'
import en from '../../locales/en.json'
import zhCN from '../../locales/zh-CN.json'

type MessageSchema = typeof en

// Read the user's saved language from Rust-injected env.
// This is set by Tauri (lib.rs / window.rs) before the page loads,
// so it's available at module initialization time.
const initialLocale: 'en' | 'zh-CN' =
  (typeof window !== 'undefined' &&
    (window as any).__TAURI_ENV__?.language === 'zh-CN')
    ? 'zh-CN'
    : 'en'

const i18n = createI18n<[MessageSchema], 'en' | 'zh-CN'>({
  legacy: true, // Compatible with Options API ($t)
  locale: initialLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    'zh-CN': zhCN as unknown as MessageSchema
  },
  missingWarn: (import.meta as any).env?.DEV ?? false,
  fallbackWarn: (import.meta as any).env?.DEV ?? false
})

export default i18n
