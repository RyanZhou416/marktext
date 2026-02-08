import type { I18n } from 'vue-i18n'

// All currently supported locales are bundled at build-time in i18n/index.ts.
// This set tracks which locales are available to avoid redundant dynamic imports.
const loaded: string[] = ['en', 'zh-CN']

/**
 * Helper to set the active locale on the i18n instance.
 *
 * In vue-i18n v10, `i18n.global.locale` is a Ref (even in legacy mode),
 * so we MUST use `.value` to set it. Using direct assignment (`locale = x`)
 * would silently replace the ref and break reactivity entirely.
 */
function setLocale (i18n: I18n, locale: string): void {
  const g = i18n.global as any
  if (g.locale && typeof g.locale === 'object' && 'value' in g.locale) {
    // vue-i18n v10: locale is a WritableComputedRef
    g.locale.value = locale
  } else {
    // Fallback (shouldn't happen in v10, but safe guard)
    g.locale = locale
  }
}

/**
 * Set the active locale. If the locale is already bundled (en, zh-CN),
 * this simply switches the active locale. For future locales not yet
 * bundled, it falls back to a dynamic import.
 */
export async function loadLocale (i18n: I18n, locale: string): Promise<void> {
  if (loaded.includes(locale)) {
    setLocale(i18n, locale)
    return
  }

  try {
    const messages = await import(`../../locales/${locale}.json`)
    ;(i18n.global as any).setLocaleMessage(locale, messages.default ?? messages)
    loaded.push(locale)
    setLocale(i18n, locale)
  } catch (e) {
    console.error(`[i18n] Failed to load locale "${locale}":`, e)
  }
}
