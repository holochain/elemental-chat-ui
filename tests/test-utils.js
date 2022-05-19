import { render } from '@testing-library/vue'
import { createLocalVue, shallowMount, mount } from '@vue/test-utils'
import Vuex from 'vuex'
import { storeRaw } from '@/store'
import Vuetify from 'vuetify'
import wait from 'waait'

const removeExtraSpaces = str => str.replace(/  +/g, ' ')
const removeTabs = str => str.replace('\t', '')
export const cleanString = str => removeTabs(removeExtraSpaces(str)).trim()

const withMarkup = (query, debug) => text => query((_, element) => {
  const hasText = (element) => cleanString(element.textContent) === cleanString(text)
  const childrenDontHaveText = Array.from(element.children).every(
    child => !hasText(child)
  )
  if (hasText(element) && childrenDontHaveText) return element
  else if (debug) {
    debug(element)
  }
  return null
})

export const handleAllWithMarkup = (query, text, debug) => {
  const results = withMarkup(query, debug)(text)
  if (!results) return console.error(`No element was found to contain string ${text}`)
  else return results
}

export const handleOneWithMarkup = (query, text, debug) => {
  const results = withMarkup(query, debug)(text)
  if (!results) {
    return console.error(`No element was found to contain string ${text}`)
  } else if (results.length > 1) {

    // when multiple results, return the top most parent element containing the correct text
    return results[0]
  } else {
    return results
  }
}

export const renderAndWait = async (element, options = {}, ms = 0, callback) => {
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

export const renderAndWaitWithStore = async (element, customStore, options = {}, ms = 0, callback) => await renderAndWait(element, { ...options, store: { ...storeRaw, ...customStore } }, ms, callback)

// For Vuetify elements that use the $vuetify instance property
export const renderAndWaitWithVuetify = async (element, options = {}, ms = 0, callback) => await renderAndWait(element, { ...options, vuetify: new Vuetify() }, ms, callback)

export const renderAndWaitFullSetup = async (element, customStore, options = {}, ms = 0, callback) => await renderAndWaitWithVuetify(element, { ...options, store: { ...storeRaw, ...customStore } }, ms, callback)

export const stub = async (element, stubs, store, ms = 0, callback) => await renderAndWaitWithVuetify(element, { stubs, store }, ms, callback)

const localVue = createLocalVue()
localVue.use(Vuex)
export const stubElement = (element, store, opts = {}) => shallowMount(element, { store, localVue, vuetify: new Vuetify(), ...opts })
export const mockElement = (element, store, opts = {}) => mount(element, { mocks: { $store: store, vuetify: new Vuetify(), ...opts } })
