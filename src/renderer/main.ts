import { createApp, h } from 'vue'
import bootstrapRenderer from './bootstrap'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
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
