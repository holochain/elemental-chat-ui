/* global it, describe */
import { render } from '@testing-library/vue'
import Vuetify from 'vuetify'
import Vue from 'vue'
import ElementalChat from '../ElementalChat.vue'
import { storeRaw as store } from '../store'

Vue.use(Vuetify)

// have to jump through some hoops for vuetify and vuex
const renderWithVuetify = (component, options, callback) => {
  const root = document.createElement('div')
  root.setAttribute('data-app', 'true')

  return render(
    component,
    {
      container: document.body.appendChild(root),
      // for Vuetify components that use the $vuetify instance property
      vuetify: new Vuetify(),
      ...options
    },
    callback
  )
}

function renderElementalChatWithStore (customStore) {
  const root = document.createElement('div')
  root.setAttribute('data-app', 'true')

  return renderWithVuetify(ElementalChat, { store: { ...store, ...customStore } })
}

describe('ElementalChat', () => {
  it('Renders a banner', async () => {
    const { getByText } = renderElementalChatWithStore()

    const bannerText = 'This is a proof of concept application, not intended for full production use. Read more in our'

    getByText(bannerText)
  })
})
