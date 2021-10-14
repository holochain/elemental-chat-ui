/* global jest, it, describe, expect, beforeEach */
import Vuetify from 'vuetify'
import Vue from 'vue'
import { renderAndWaitFullSetup, stubElement } from '../../test-utils'
import ElementalChat from '@/ElementalChat.vue'
import {
  mockHolochainState,
  resetHolochainState,
  mockAgentState,
  getStubbedStore
} from '../../mock-helpers'

jest.mock('@/store/callZome')

Vue.use(Vuetify)

describe('ElementalChat with store stubs and mocks', () => {
  let stubbedStore
  beforeAll(() => {
    mockAgentState.needsHandle = false
    mockAgentState.agentHandle = 'Alice'
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })
  afterAll(() => {
    resetHolochainState()
  })

  it('Displays correct page title', async () => {
    console.log("1 Displays >>>>>>>>>>>>>>>>>>>>>");
    
    const { getByRole } = await renderAndWaitFullSetup(ElementalChat)
    console.log("2 Displays >>>>>>>>>>>>>>>>>>>>>");
    const title = getByRole('title', { name: /page title/i })
    console.log("3 Displays >>>>>>>>>>>>>>>>>>>>>");
    expect(title).toBeTruthy()
    console.log("4 Displays >>>>>>>>>>>>>>>>>>>>>");
    expect(title.innerHTML.trim()).toEqual('Elemental Chat')
  
    console.log("5 Displays >>>>>>>>>>>>>>>>>>>>>");
  })

  it('handles initalizing Holo Client', async () => {
    stubbedStore = getStubbedStore(mockAgentState, {
      ...mockHolochainState,
      isHoloAnonymous: false
    })
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(ElementalChat, stubbedStore)
    expect(wrapper.is(ElementalChat)).toBe(true)
    expect(wrapper.find('[aria-label="Logout with Holo"]').exists()).toBe(true)
  })
})
