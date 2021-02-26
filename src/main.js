import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import store from './store'
import vuetify from './plugins/vuetify'
import Dexie from 'dexie'
const hcDb = new Dexie('holochain')

const storeSubscriber = store
storeSubscriber.state.hcDb = hcDb

Vue.config.productionTip = false
window.App = new Vue({
  store: storeSubscriber,
  vuetify,
  render: h => h(App)
}).$mount('#app')
