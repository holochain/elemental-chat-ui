/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { within, waitFor, fireEvent } from '@testing-library/vue'
import { renderAndWaitFullSetup, handleOneWithMarkup, stubElement } from '../../../test-utils'
import { createNewChannel, resetHolochainState, mockAgentState, resetAgentState, mockChatState as defaultChatState, resetChatState, createMockChannel, setStubbedStore } from '../../../mock-helpers'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Messages from '@/components/Messages.vue'
import store from '@/store/index'

jest.mock('@/store/callZome')

Vue.use(Vuetify)

describe('Messages with real store', () => {
  beforeAll(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it.only('creates a new message within new channel', async () => {
    // create channel
    const channelTitle = 'Music Room'
    await store.dispatch('elementalChat/createChannel', createNewChannel(channelTitle))
    const storedChannel = () => store.state.elementalChat.channels[0]
    console.log('storedChannel >>>>>> : ', storedChannel())
    console.log('channel.messages : ', storedChannel().messages)
    expect(storedChannel().messages.length).toEqual(0)
    const { getByLabelText, getByRole } = await renderAndWaitFullSetup(Messages)
    // create message on channel
    const newMessageContent = 'Alice: Some super creative, captivating message.'
    const messageInputBox = getByLabelText('Send a message')
    expect(messageInputBox).toBeTruthy()
    await fireEvent.update(messageInputBox, newMessageContent)
    await fireEvent.keyDown(messageInputBox, { key: 'Enter', code: 'Enter' })
    const messageList = getByRole('list', { name: /message list/i })
    const { getByText: getOneByBannerText } = within(messageList)
    const bannerWithText = handleOneWithMarkup(getOneByBannerText, newMessageContent)
    expect(bannerWithText).toBeTruthy()
    expect(storedChannel().messages.length).toEqual(1)
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
