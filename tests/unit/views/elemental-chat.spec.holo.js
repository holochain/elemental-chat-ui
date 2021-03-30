/* global jest, it, describe, expect, beforeEach */
import Vuetify from 'vuetify'
import Vue from 'vue'
import { renderAndWaitFullSetup } from '../../test-utils'
import ElementalChat from '@/ElementalChat.vue'

jest.mock('@/store/callZome')

Vue.use(Vuetify)

describe('ElementalChat with real store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('Displays correct page title', async () => {
    const { getByRole } = await renderAndWaitFullSetup(ElementalChat)
    const title = getByRole('title', { name: /page title/i })
    expect(title).toBeTruthy()
  })

  it('Renders logout button when in holo hosting environment', async () => {
    const { getByText } = await renderAndWaitFullSetup(ElementalChat)
    const statsInfoBtn = getByText('Logout')
    expect(statsInfoBtn).toBeTruthy()
  })
})
