/* global jest, it, describe, expect, beforeEach */
import Vuetify from 'vuetify'
import Vue from 'vue'
import { renderAndWaitFullSetup, stubElement } from '../../test-utils'
import ElementalChat from '@/ElementalChat.vue'
import { mockHolochainState, resetHolochainState, mockAgentState, getStubbedStore } from '../../mock-helpers'


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
    const { getByRole } = await renderAndWaitFullSetup(ElementalChat)
    const title = getByRole('title', { name: /page title/i })
    expect(title).toBeTruthy()
    expect(title.innerHTML.trim()).toEqual('Elemental Chat')
  })

  it('handles initalizing Holo Client', async () => {
    stubbedStore = getStubbedStore(mockAgentState, { ...mockHolochainState, isHoloSignedIn: true })
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(ElementalChat, stubbedStore)
    expect(wrapper.is(ElementalChat)).toBe(true)
    expect(wrapper.find('[aria-label="Logout with Holo"]').exists()).toBe(true)
  })
})
