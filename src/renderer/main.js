import Vue from 'vue'
// vue-electron 移除 - 不兼容 contextIsolation，使用 util/electron.js 替代
// source-map-support 移除 - 需要 Node.js fs/path 模块
import bootstrapRenderer from './bootstrap'
import VueRouter from 'vue-router'
import lang from 'element-ui/lib/locale/lang/en'
import locale from 'element-ui/lib/locale'
import axios from './axios'
import store from './store'
import './assets/symbolIcon'
import {
  Dialog,
  Form,
  FormItem,
  InputNumber,
  Button,
  Tooltip,
  Upload,
  Slider,
  Checkbox,
  ColorPicker,
  Col,
  Row,
  Tree,
  Autocomplete,
  Switch,
  Select,
  Option,
  Radio,
  RadioGroup,
  Table,
  TableColumn,
  Tabs,
  TabPane,
  Input
} from 'element-ui'
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

// Configure Vue
locale.use(lang)

Vue.use(Dialog)
Vue.use(Form)
Vue.use(FormItem)
Vue.use(InputNumber)
Vue.use(Button)
Vue.use(Tooltip)
Vue.use(Upload)
Vue.use(Slider)
Vue.use(Checkbox)
Vue.use(ColorPicker)
Vue.use(Col)
Vue.use(Row)
Vue.use(Tree)
Vue.use(Autocomplete)
Vue.use(Switch)
Vue.use(Select)
Vue.use(Option)
Vue.use(Radio)
Vue.use(RadioGroup)
Vue.use(Table)
Vue.use(TableColumn)
Vue.use(Tabs)
Vue.use(TabPane)
Vue.use(Input)

Vue.use(VueRouter)
// VueElectron 已移除 - 使用 util/electron.js 替代
Vue.http = Vue.prototype.$http = axios
Vue.config.productionTip = false

services.forEach((s) => {
  Vue.prototype['$' + s.name] = s[s.name]
})

const router = new VueRouter({
  routes: routes(window.marktext.env.type)
})

/* eslint-disable no-new */
new Vue({
  store,
  router,
  template: '<router-view class="view"></router-view>'
}).$mount('#app')
