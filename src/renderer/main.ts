import { createApp, h, watch } from 'vue'
import bootstrapRenderer from './bootstrap'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import i18n from './i18n'
import { loadLocale } from './i18n/loader'
import axios from './axios'
import './assets/symbolIcon'
import services from './services'
import routes from './router'
import { addElementStyle } from '@/util/theme'

import './assets/styles/index.css'
import './assets/styles/printService.css'

// -----------------------------------------------

;(window as any).marktext = {}
bootstrapRenderer()

addElementStyle()

// -----------------------------------------------
// Be careful when changing code before this line!

// Create Vue 3 app instance
const App = {
  render () {
    return h(RouterView, { class: 'view' })
  }
}

const app = createApp(App)

// Configure Element Plus
app.use(ElementPlus)

// Configure i18n — initial locale is set in i18n/index.ts from window.__TAURI_ENV__.language
// which is injected by Rust via initialization_script before any JS runs.
app.use(i18n)

// Configure Pinia
const pinia = createPinia()
app.use(pinia)

// Configure Vue Router 4
const router = createRouter({
  history: createWebHashHistory(),
  routes: routes((window as any).marktext.env.type)
})

app.use(router)

// Add axios to global properties
app.config.globalProperties.$http = axios

// Add services to global properties
services.forEach((s: any) => {
  app.config.globalProperties['$' + s.name] = s[s.name]
})

// Mount the app
app.mount('#app')

// Reactively sync i18n locale with user's language preference.
// The preferences store starts with language='en' (default) and is later updated
// asynchronously when ASK_FOR_USER_PREFERENCE resolves from the backend.
// This watcher ensures the i18n locale stays in sync when user changes language at runtime.
import { usePreferencesStore } from './stores/preferences'
const prefsStore = usePreferencesStore()
watch(
  () => prefsStore.language,
  async (newLang) => {
    if (newLang) {
      await loadLocale(i18n, newLang)
    }
  },
  { immediate: true }
)
