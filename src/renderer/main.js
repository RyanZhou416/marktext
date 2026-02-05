import { createApp, h } from 'vue'
// vue-electron 移除 - 不兼容 contextIsolation，使用 util/electron.js 替代
// source-map-support 移除 - 需要 Node.js fs/path 模块
import bootstrapRenderer from './bootstrap'
import { createRouter, createWebHashHistory, RouterView } from 'vue-router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import axios from './axios'
import store from './store' // Vuex store (临时保留，逐步迁移到 Pinia)
import './assets/symbolIcon'
import services from './services'
import routes from './router'
import { addElementStyle } from '@/util/theme'

import './assets/styles/index.css'
import './assets/styles/printService.css'

// -----------------------------------------------

// source-map-support 已移除 - 使用浏览器原生错误堆栈

window.marktext = {}
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

// Configure Element Plus (locale set in component level if needed)
app.use(ElementPlus)

// Configure Pinia (新状态管理)
const pinia = createPinia()
app.use(pinia)

// Configure Vue Router 4
const router = createRouter({
  history: createWebHashHistory(),
  routes: routes(window.marktext.env.type)
})

app.use(router)
app.use(store) // Vuex store (临时保留，逐步迁移)

// Add axios to global properties
app.config.globalProperties.$http = axios

// Add services to global properties
services.forEach((s) => {
  app.config.globalProperties['$' + s.name] = s[s.name]
})

// Mount the app
app.mount('#app')
