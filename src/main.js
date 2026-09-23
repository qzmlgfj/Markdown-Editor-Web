import { createApp } from 'vue'
import App from './App.vue'
import store from './utils/store'

import 'vfonts/Lato.css'
import 'vfonts/FiraCode.css'
import './themes/base46.css'

createApp(App)
    .use(store)
    .mount('#app')
