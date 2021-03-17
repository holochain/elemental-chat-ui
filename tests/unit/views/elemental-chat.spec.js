/* global it, describe, expect, beforeAll, afterAll */
import Vuetify from 'vuetify'
import Vue from 'vue'
import { waitFor, fireEvent } from '@testing-library/vue'
import { renderAndWaitFullSetup } from '../../test-utils'
import ElementalChat from '@/ElementalChat.vue'

Vue.use(Vuetify)

describe('ElementalChat', () => {
  it.only('Renders a banner', async () => {
    const { getByText } = await renderAndWaitFullSetup(ElementalChat)

    const bannerText = 'This is a proof of concept application, not intended for full production use. Read more in our'

    getByText(bannerText)
  })
})
