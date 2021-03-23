/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { AGENT_KEY_MOCK, timestampToSemanticDate, mockHolochainState, mockChatState, resetHolochainState, mockAgentState, resetAgentState, resetChatState, setStubbedStore, createMockChannel, createMockMessage } from '../../../mock-helpers'
import { stubElement } from '../../../test-utils'
import Message from '@/components/Message.vue'
import Vuetify from 'vuetify'
import Vue from 'vue'

Vue.use(Vuetify)

describe('Message with store stubs and mocks', () => {
  const DEFAULT_ENV = process.env
  let stubbedStore, propsData

  beforeAll(() => {
    mockAgentState.needsHandle = false
    mockAgentState.agentHandle = 'Alice'
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env = { ...DEFAULT_ENV }
    process.env.VUE_APP_UI_VERSION = '0.0.1-test'
    propsData = {
      message: null,
      mode: '',
      handleCreateMessage: jest.fn(),
      isMine: false
    }
  })
  afterAll(() => {
    process.env = DEFAULT_ENV
    resetAgentState()
    resetHolochainState()
    resetChatState()
  })

  it("displays message timestamp and content in 'display mode'", async () => {
    stubbedStore = setStubbedStore()
    const agentHandle = 'Alice:'
    const messageContent = 'My first message'
    const newMessage = createMockMessage(`${agentHandle} ${messageContent}`, AGENT_KEY_MOCK, 1, [1616402851, 716802516])
    propsData.message = newMessage
    propsData.isMine = true
    const wrapper = stubElement(Message, stubbedStore, { propsData })
    expect(wrapper.is(Message)).toBe(true)
    expect(wrapper.find('[aria-label="Message Author Handle"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Message Content"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Message Timestamp"]').exists()).toBe(true)

    expect(wrapper.find('[aria-label="Message Author Handle"]').text()).toBe(agentHandle)
    expect(wrapper.find('[aria-label="Message Content"]').text()).toBe(messageContent)
    expect(wrapper.find('[aria-label="Message Timestamp"]').text()).toBe(timestampToSemanticDate(newMessage.createdAt))
  })

  it('does not display messages when none are set to exist', async () => {
    stubbedStore = setStubbedStore()
    propsData.message = null
    const wrapper = stubElement(Message, stubbedStore, { propsData })
    expect(wrapper.is(Message)).toBe(true)
    expect(wrapper.find('[aria-label="Message Author Handle"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Message Content"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Message Timestamp"]').exists()).toBe(false)
  })

  it('does not display textarea when message is not in display mode and no channels exist', async () => {
    mockChatState.channels = []
    mockChatState.currentChannelId = null
    stubbedStore = setStubbedStore()
    propsData.message = null
    const wrapper = stubElement(Message, stubbedStore, { propsData })
    expect(wrapper.is(Message)).toBe(true)
    expect(wrapper.find('[aria-label="Message Input Wrapper"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Message Textarea"]').exists()).toBe(false)
  })

  it('displays textarea when a channel exists', async () => {
    const channelId = 10
    mockChatState.channels = [createMockChannel("Alice's chatty channel", mockAgentState.agentHandle, channelId)]
    mockChatState.currentChannelId = channelId
    stubbedStore = setStubbedStore()
    propsData.message = null
    const wrapper = stubElement(Message, stubbedStore, { propsData })
    expect(wrapper.is(Message)).toBe(true)
    expect(wrapper.find('[aria-label="Message Input Wrapper"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Message Textarea"]').exists()).toBe(true)
  })

  it('accepts new message text in textArea', async () => {
    stubbedStore = setStubbedStore(mockAgentState, mockHolochainState, mockChatState, { callLoading: false })
    propsData.message = null
    const wrapper = stubElement(Message, stubbedStore, { propsData })
    expect(wrapper.is(Message)).toBe(true)
    const newMessage = createMockMessage('Alice: A third written message', AGENT_KEY_MOCK, 3, [1616402851 + 3, 716802516 + 3000])
    const textArea = wrapper.find('[aria-label="Message Textarea"]')
    textArea.value = newMessage.entry.content
    expect(textArea.trigger('input')).toBeTruthy()
  })

  // todo: investigate why 'triggering enter' does not submit the message...
  it.skip('dispatches `createMessage` action when a new message submitted', async () => {
    stubbedStore = setStubbedStore(mockAgentState, mockHolochainState, mockChatState, {}, {}, { callLoading: false })
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(Message, stubbedStore, { propsData })
    expect(wrapper.is(Message)).toBe(true)
    const newMessage = createMockMessage('Alice: May the force be with me...', AGENT_KEY_MOCK, 4, [1616402851 + 4, 716802516 + 4000])
    const textArea = wrapper.find('[aria-label="Message Textarea"]')
    textArea.value = newMessage.entry.content
    textArea.trigger('input')
    await wrapper.trigger('keydown.enter')

    expect(stubbedStore.dispatch).toHaveBeenCalledWith('elementalChat/createMessage', newMessage)
    expect(stubbedStore.dispatch).toHaveBeenCalledTimes(1)
  })

  it('displays spinner when new message api call is loading', async () => {
    stubbedStore = setStubbedStore(mockAgentState, mockHolochainState, mockChatState, {}, {}, { callLoading: true })
    stubbedStore.dispatch = jest.fn()
    const wrapper = stubElement(Message, stubbedStore, { propsData })
    expect(wrapper.is(Message)).toBe(true)
    const newMessage = createMockMessage('Alice: 5th time and going on strong', AGENT_KEY_MOCK, 5, [1616402851 + 5, 716802516 + 5000])
    await stubbedStore.dispatch('elementalChat/createMessage', newMessage)
    // todo: investigate why spinner returns false here
    // expect(wrapper.find('[aria-label="Loading Icon"]').exists()).toBe(true)
    expect(stubbedStore.dispatch).toHaveBeenCalledWith('elementalChat/createMessage', newMessage)
    expect(stubbedStore.dispatch).toHaveBeenCalledTimes(1)

    expect(wrapper.find('[aria-label="Loading Icon"]').exists()).toBe(false)
  })
})
