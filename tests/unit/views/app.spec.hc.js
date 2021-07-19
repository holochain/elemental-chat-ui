/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { stubElement } from '../../test-utils'
import { AGENT_KEY_MOCK, DNA_HASH_MOCK, createNewChannel, getStubbedActions, getStubbedMutations, resetHolochainState, resetAgentState, resetChatState, getStubbedStore, mockChatState } from '../../mock-helpers'
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
    appConductor = new MockConductor(9090, 9091)
    appConductor.any(MOCK_CELL_DATA)
    createLocalVue().use(Vuex)
    getStubbedMutations({
      holochain: {
        setReconnecting: jest.fn()
      }
    })
    stubbedStore = getStubbedStore()
    holochainState = {
      ...mockChatState,
      holochainClient: Promise.resolve({}),
      conductorDisconnected: false,
      firstConnect: false,
      reconnectingIn: 0,
      appInterface: {
        port: 9091,
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
    stubbedStore = getStubbedStore(null, holochainState)
    stubbedStore.dispatch = jest.fn()
    stubElement(App, stubbedStore)
    await wait(2000)
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('initializeStore')
    expect(stubbedStore.dispatch).toHaveBeenCalledTimes(3)
  })

  it("dispatches `skipBackoff` action when 'retry now' button is pressed", async () => {
    getStubbedActions({
      chat: { skipBackoff: jest.fn() }
    })
    stubbedStore = getStubbedStore(null, holochainState)
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(App, stubbedStore)

    await wait(2000)
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('initializeStore')
    expect(stubbedStore.dispatch).toHaveBeenCalledTimes(3)

    // set the disconnected to true
    await wrapper.find('[aria-label="Reconnect Now Button"]').vm.$emit('click')
    await wait(2000)
    expect(stubbedStore.dispatch.mock.calls[3][0]).toEqual('holochain/skipBackoff')
  })

  it('displays proper modal when reconnecting to holochain ', async () => {
    const disconnectedHolochainState = {
      ...holochainState,
      conductorDisconnected: true,
      firstConnect: false,
      reconnectingIn: 0,
      holoClient: null,
      isHoloSignedIn: true,
      isChaperoneDisconnected: false
    }
    stubbedStore = getStubbedStore(null, disconnectedHolochainState)
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(App, stubbedStore)
    await wait(2000)
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('initializeStore')

    await stubbedStore.dispatch('holochain/resetConnectionState')
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('holochain/resetConnectionState')
    // check that reconnecting modal appears
    const reconnectionModal = await wrapper.find('[aria-label="Reconnecting to Holochain Dialog"]')
    expect(reconnectionModal).toBeTruthy()
  })

  it('displays proper modal when unable to connect to holoport ', async () => {
    const disconnectedHolochainState = {
      ...holochainState,
      conductorDisconnected: true,
      firstConnect: false,
      reconnectingIn: 0,
      holoClient: null,
      isHoloSignedIn: true,
      isChaperoneDisconnected: false
    }
    stubbedStore = getStubbedStore(null, disconnectedHolochainState)
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(App, stubbedStore)
    await wait(2000)
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('initializeStore')

    await stubbedStore.dispatch('holochain/signalHoloDisconnect')
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('holochain/signalHoloDisconnect')
    // check that hp disconnection modal appears
    const disconnectedModal = await wrapper.find('[aria-label="Connecting to Holo Dialog"]')
    expect(disconnectedModal).toBeTruthy()
  })
})
