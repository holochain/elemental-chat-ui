/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { within, waitFor, fireEvent } from '@testing-library/vue'
import store from '@/store/index'
import { renderAndWaitFullSetup, handleOneWithMarkup, stubElement } from '../../../test-utils'
import { createNewChannel, resetHolochainState, mockAgentState, resetAgentState, mockChatState as defaultChatState, resetChatState, createMockChannel, setStubbedStore } from '../../../mock-helpers'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Messages from '@/components/Messages.vue'

Vue.use(Vuetify)

describe('Message with real store', () => {
  it('creates a new message within new channel', async () => {
    // create channel
    await store.dispatch('elementalChat/createChannel', createNewChannel(channelId, 'Channel1'))
    const storedChannel = () => store.state.elementalChat.channels[0]
    expect(storedChannel().messages.length).toEqual(0)
    const channelTitle = 'My first channel'


    const { getByLabelText, getByRole } = await renderAndWaitFullSetup(Messages)
    // create message on channel
    const newMessageContent = 'Some super creative, captivating message.'
    const messageInputBox = getByLabelText('Send a message')
    expect(messageInputBox).toBeTruthy()
    await fireEvent.update(messageInputBox, newMessageContent)
    await fireEvent.keyDown(messageInputBox, { key: 'Enter', code: 'Enter' })

    expect(storedChannels().length).toEqual(1)
  })
})

describe('Messages with store stubs and mocks', () => {
  const DEFAULT_ENV = process.env
  let channelTitle = 'An amazing new channel'
  let channelId = 0
  let stubbedStore

  beforeAll(() => {
    mockAgentState.needsHandle = false
    mockAgentState.agentHandle = 'Alice'
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env = { ...DEFAULT_ENV }
    process.env.VUE_APP_UI_VERSION = '0.0.1-test'
  })
  afterAll(() => {
    process.env = DEFAULT_ENV
    resetAgentState()
    resetHolochainState()
    resetChatState()
  })

  it('displays the correct number of messages', () => {
    // await store.dispatch('elementalChat/createChannel', createNewChannel(1, channelTitle))
    // console.log('IN TEST >> storedChannels() : ', storedChannels())
    // const newChannel = storedChannels()[0]
    // console.log('NEW CHANNEL : ', newChannel.last_seen, newChannel.name, newChannel.entry, newChannel.info, newChannel.messages, newChannel.unseen)

    // Follow up on ID and make see if/how it impact ordering... (order should be alphabetical for channels)
    // expect(wrapper.findAllComponents(Child).length).toBe(3)
  })
})
