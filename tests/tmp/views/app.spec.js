/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { stub, stubElement } from '../../test-utils'
import { AGENT_KEY_MOCK, DNA_HASH_MOCK, stubbedActions, setStubbedActions, stubbedMutations, setStubbedMutations, mockHolochainState, resetHolochainState, mockAgentState, resetAgentState, mockChatState as defaultChatState, resetChatState, createMockChannel, setStubbedStore, mockWindowRedirect, mockWindowReplace, navigateToNextLocation, windowSpy, mockChatState } from '../../mock-helpers'
import Vuetify from 'vuetify'
import Vue from 'vue'
import Vuex from 'vuex'
import App from '@/App.vue'
import wait from 'waait'

Vue.use(Vuetify)

// ///////////////// //
// The following tests mock the store and test the following vuex and vue implementation parts :
// 1. correct actions are dispatched,
// 2. correct mutations are commited,
// 3. state is updated correctly,
// 4. getters are referenced properly
// 5. (mocked) state is the current value of the store
describe('App with store stubs and mocks', () => {
  const DEFAULT_ENV = process.env
  const appVersion = '0.0.1-test'
  let stubbedStore, holochainState
  beforeAll(() => {
    holochainState = {
      ...mockChatState,
      holochainClient: Promise.resolve({}),
      conductorDisconnected: false,
      firstConnect: false,
      reconnectingIn: 0,
      appInterface: {
        port: 8888,
        appId: 'elemental-chat',
        cellId: [DNA_HASH_MOCK, AGENT_KEY_MOCK],
        appVersion
      },
      dnaAlias: 'elemental-chat-alias-test',
      isLoading: {}, // dictionary of loading calls
      hostUrl: '',
      holoClient: null,
      isHoloSignedIn: false,
      isChaperoneDisconnected: false
    }
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env = { ...DEFAULT_ENV }
    process.env.VUE_APP_UI_VERSION = appVersion
  })
  afterAll(() => {
    process.env = DEFAULT_ENV
    resetAgentState()
    resetHolochainState()
    resetChatState()
  })

  it('calls `initializeStore` action on init', async () => {
    stubbedStore = setStubbedStore(null, holochainState)
    stubbedStore.dispatch = jest.fn()
    stubElement(App, stubbedStore)
    await wait(2000)
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('initializeStore')
    expect(stubbedStore.dispatch).toHaveBeenCalledTimes(1)
  })

  it('handles agent without nickame on init', async () => {})

  it('handles agent with nickame on init', async () => {})

  // TODO: use testing-lib if mock connection status
  it.skip('Updates agent nickname and displays update in appbar', async () => {
    stubbedStore = setStubbedStore()
    const wrapper = stubElement(App, stubbedStore)
    expect(wrapper.is(App)).toBe(true)

    console.log('\n\n\n=============================================')
    // expect(agentNickname).toBeInTheDocument()
    // const updateNickBtn = getByRole('button', { name: /update agent handle/i })
    // fireEvent.click(updateNickBtn)
    // debug()
  })

  it('commits `setAgentHandle` mutation when a new agent handle submitted', async () => {
    setStubbedMutations()
    stubbedStore = setStubbedStore()
    const wrapper = stubElement(App, stubbedStore)
    expect(wrapper.is(App)).toBe(true)

    // await wrapper.find('#channel-name').setValue(channelTitle)
    // await wrapper.trigger('keydown.enter')
    // await wrapper.vm.$nextTick()
    // expect(store.dispatch).toHaveBeenCalledWith('setAgentHandle', {})
  })

  it('handles disconnection', async () => {})

  it.only("dispatches `skipBackoff` action when 'retry now' button is pressed", async () => {
    setStubbedActions({
      chat: { skipBackoff: jest.fn() }
    })
    stubbedStore = setStubbedStore(null, holochainState)
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(App, stubbedStore)

    await wait(2000)

    // refs:
    // expect(stubbedStore.dispatch).toHaveBeenCalledWith('initializeStore')
    // expect(stubbedStore.dispatch).toHaveBeenCalledTimes(1)

    // set the disconnected to true
    wrapper.find('[aria-label="Reconnect Now Button"]').trigger('click')
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('holochain/skipBackoff')
  })
})
