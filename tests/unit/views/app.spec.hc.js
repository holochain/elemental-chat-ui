/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { stubElement } from '../../test-utils'
import { AGENT_KEY_MOCK, DNA_HASH_MOCK, setStubbedActions, setStubbedMutations, resetHolochainState, resetAgentState, resetChatState, setStubbedStore, mockChatState } from '../../mock-helpers'
import { createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import Vue from 'vue'
import Vuetify from 'vuetify'
import App from '@/App.vue'
import wait from 'waait'

jest.mock('@/store/callZome')

Vue.use(Vuetify)

const MockConductor = require('@holo-host/mock-conductor')

describe('App with store stubs and mocks', () => {
  let stubbedStore, appConductor, holochainState
  const MOCK_CELL_ID = [DNA_HASH_MOCK, AGENT_KEY_MOCK]
  const MOCK_CELL_DATA = {
    cell_data: [{
      cell_id: MOCK_CELL_ID,
      cell_nick: 'elemental-chat'
    }]
  }

  beforeAll(() => {
    appConductor = new MockConductor(9090, 8080)
    appConductor.any(MOCK_CELL_DATA)
    createLocalVue().use(Vuex)
    setStubbedMutations({
      holochain: {
        setReconnecting: jest.fn()
      }
    })
    stubbedStore = setStubbedStore()
    holochainState = {
      ...mockChatState,
      holochainClient: Promise.resolve({}),
      conductorDisconnected: false,
      firstConnect: false,
      reconnectingIn: 0,
      appInterface: {
        port: 8080,
        appId: 'elemental-chat',
        cellId: [DNA_HASH_MOCK, AGENT_KEY_MOCK],
        appVersion: process.env.VUE_APP_UI_VERSION
      },
      dnaAlias: 'elemental-chat-alias-test',
      isLoading: {},
      hostUrl: '',
      holoClient: null,
      isHoloSignedIn: false,
      isChaperoneDisconnected: false
    }
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })
  afterAll(async () => {
    resetAgentState()
    resetHolochainState()
    resetChatState()
    await appConductor.close()
  })

  it('calls `initializeStore` action on init', async () => {
    stubbedStore = setStubbedStore(null, holochainState)
    stubbedStore.dispatch = jest.fn()
    stubElement(App, stubbedStore)
    await wait(2000)
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('initializeStore')
    expect(stubbedStore.dispatch).toHaveBeenCalledTimes(2)
  })

  // await connection issue
  it.skip('handles initializing agent nickname', async () => {
    setStubbedMutations()
    stubbedStore = setStubbedStore()
    const wrapper = stubElement(App, stubbedStore)
    expect(wrapper.is(App)).toBe(true)

    const updateAgentBtn = await wrapper.find('[aria-label="Update Agent Handle"]')
    updateAgentBtn.trigger('click')
    await wrapper.find('[aria-label="Agent Handle Input"]').setValue('Updated Alice')
    await wrapper.find('[aria-label="Agent Handle Input"]').trigger('click')
    // await wrapper.trigger('keydown.enter')
    await wrapper.vm.$nextTick()
    // expect(store.dispatch).toHaveBeenCalledWith('setAgentHandle', {})
  })

  it("dispatches `skipBackoff` action when 'retry now' button is pressed", async () => {
    setStubbedActions({
      chat: { skipBackoff: jest.fn() }
    })
    stubbedStore = setStubbedStore(null, holochainState)
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(App, stubbedStore)

    await wait(2000)
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('initializeStore')
    expect(stubbedStore.dispatch).toHaveBeenCalledTimes(2)

    // set the disconnected to true
    await wrapper.find('[aria-label="Reconnect Now Button"]').vm.$emit('click')
    await wait(2000)
    expect(stubbedStore.dispatch.mock.calls[2][0]).toEqual('holochain/skipBackoff')
  })
})
