import { render } from '@testing-library/vue'
import { storeRaw } from '@/store'
import Vuetify from 'vuetify'
import wait from 'waait'

export const renderAndWait = async (element, ms = 0, options = {}, callback) => {
  const root = document.createElement('div')
  root.setAttribute('data-app', 'true')
  const setupOptions = {
    container: document.body.appendChild(root),
    ...options
  }
  const queries = render(element, setupOptions, callback)
  await wait(ms)
  return queries
}

export const renderAndWaitWithStore = async (element, ms = 0, customStore, options = {}, callback) => await renderAndWait(element, ms, { ...options, store: { ...storeRaw, ...customStore } }, callback)

// For Vuetify elements that use the $vuetify instance property
export const renderAndWaitWithVuetify = async (element, ms = 0, options = {}, callback) => await renderAndWait(element, ms, { ...options, vuetify: new Vuetify() }, callback)

export const renderAndWaitFullSetup = async (element, ms = 0, customStore, options = {}, callback) => await renderAndWaitWithVuetify(element, ms, { ...options, store: { ...storeRaw, ...customStore } }, callback)
