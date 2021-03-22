/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { within, waitFor, fireEvent } from '@testing-library/vue'
import store from '@/store/index'
import { renderAndWaitFullSetup, handleOneWithMarkup, stub, stubElement } from '../../test-utils'
import { mockHolochainState, resetHolochainState, mockAgentState, resetAgentState, mockChatState as defaultChatState, resetChatState, createMockChannel, setStubbedStore, mockWindowRedirect, mockWindowReplace, navigateToNextLocation, windowSpy } from '../../mock-helpers'
import Channels from '@/components/Channels.vue'
import Vuetify from 'vuetify'
import Vue from 'vue'
import wait from 'waait'

Vue.use(Vuetify)

describe('Channels with real store', () => {
  it('displays updated channel list whenever refresh button clicked', async () => {
    const { getByRole, debug } = await renderAndWaitFullSetup(Channels)
    // check list number of channels
    // dispatch 3 new signals of new channels
    // locate refresh button and click
    // expect list number to be increased by a volume of 3
  })
})

// ///////////////// //
// The following tests mock the store and test the following vuex and vue implementation parts :
// 1. correct actions are dispated,
// 2. correct mutations are commitd,
// 3. state is updated correctly,
// 4. getters are referenced properly
// 5. (mocked) state is the current value of the
describe('Channels with store stubs and mocks', () => {
  const DEFAULT_ENV = process.env
  let channelTitle = 'An amazing new channel'
  let channelId = 0
  let stubbedStore

  const createNewChannel = (uuid, name) => ({
    info: {
      name,
      created_by: ''
    },
    entry: { category: 'General', uuid },
    messages: [],
    last_seen: {}
  })

  beforeAll(() => {
    mockAgentState.needsHandle = false
    mockAgentState.agentHandle = 'Alice'
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules() // Most important - it clears the cache
    process.env = { ...DEFAULT_ENV }
    process.env.VUE_APP_UI_VERSION = '0.0.1-test'
  })
  afterAll(() => {
    process.env = DEFAULT_ENV
    resetAgentState()
    resetHolochainState()
    resetChatState()
  })

  it.only('dispatches `createChannel` action when a new channel submitted', async () => {
    channelId = 10
    channelTitle = 'An amazing new channel'
    const mockChatState = {
      ...defaultChatState,
      stats: {
        agentCount: 1,
        activeCount: 1,
        channelCount: 1,
        messageCount: 0
      },
      channels: [createMockChannel(channelId, channelTitle, mockAgentState.agentHandle)],
      currentChannelId: channelId
    }
    stubbedStore = setStubbedStore(null, null, mockChatState)
    const wrapper = stubElement(Channels, stubbedStore)
    expect(wrapper.is(Channels)).toBe(true)
    await wrapper.find('#channel-name').setValue(channelTitle)
    await wrapper.trigger('keydown.enter')
    await wrapper.vm.$nextTick()
    expect(store.dispatch).toHaveBeenCalledWith('elementalChat/createChannel', createNewChannel(channelId, channelTitle))
  })

  it('displays the + sign whenever a new channel appears', async () => {
    ///
  })

  it('displays the correct number of channels', () => {
    // await store.dispatch('elementalChat/createChannel', createNewChannel(1, channelTitle))
    // console.log('IN TEST >> storedChannels() : ', storedChannels())
    // const newChannel = storedChannels()[0]
    // console.log('NEW CHANNEL : ', newChannel.last_seen, newChannel.name, newChannel.entry, newChannel.info, newChannel.messages, newChannel.unseen)

    // Follow up on ID and make see if/how it impact ordering... (order should be alphabetical for channels)
    // expect(wrapper.findAllComponents(Child).length).toBe(3)
  })

  it('dispatches `listChannels` action when a refresh button clicked', async () => {
    ///
  })

  it('dispatches `joinChannel` action when another channel selected', async () => {
    ///
  })
})
