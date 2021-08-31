/* global jest, it, describe, expect, beforeEach */
import { getStubbedStore, createNewChannel, createNewMessage, createMockMessage, AGENT_KEY_MOCK } from '../../mock-helpers'
import Vuex from 'vuex'
import { createLocalVue } from '@vue/test-utils'
import store from '@/store/index'

jest.mock('@/store/callZome')

describe('elementalChat store', () => {
  let stubbedStore
  beforeEach(async () => {
    createLocalVue().use(Vuex)
    stubbedStore = getStubbedStore()
  })

  it('manages storeChannelUnseen count', async () => {
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(null)
    const channel1 = createNewChannel('Channel1', AGENT_KEY_MOCK, 1)
    await stubbedStore.dispatch('elementalChat/createChannel', channel1)
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(1)
    await stubbedStore.dispatch('elementalChat/createChannel', createNewChannel('Channel2', AGENT_KEY_MOCK, 2))
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(2)
    // Check the initial stats state
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(0)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(0)

    await stubbedStore.dispatch('elementalChat/getStats')
    // channelCount is 3 because we just added two and had one in state from the mock
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(3)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(0)

    stubbedStore.commit('elementalChat/addMessagesToChannel', {
      channel: channel1,
      messages: [createNewMessage('new message', AGENT_KEY_MOCK, 11)]
    })
    expect(stubbedStore.state.elementalChat.channels[0].unseen).toEqual(false)
    expect(stubbedStore.state.elementalChat.channels[1].unseen).toEqual(true)
    expect(stubbedStore.state.elementalChat.channels[2].unseen).toEqual(false)
  })

  it('manages getstoredStats content', async () => {
    // check initial state
    expect((stubbedStore.state.elementalChat.channels).length).toEqual(3)
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(2)

    // check inital stored stats state
    // channelCount is 3 because we just added two and had one in state from the mock
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(3)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(0)

    // add two channels
    const channel3 = createNewChannel('Channel3', AGENT_KEY_MOCK, 3)
    await stubbedStore.dispatch('elementalChat/createChannel', channel3)
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(3)
    const channel4 = createNewChannel('Channel4', AGENT_KEY_MOCK, 4)
    await stubbedStore.dispatch('elementalChat/createChannel', channel4)
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(4)

    // check updated state and stats state
    await stubbedStore.dispatch('elementalChat/getStats')
    expect((stubbedStore.state.elementalChat.channels).length).toEqual(5)
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(5)
    // make sure messageCount hasn't changed
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(1)

    // add messages to channel 4
    stubbedStore.commit('elementalChat/addMessagesToChannel', {
      channel: channel4,
      messages: [createNewMessage('new message', AGENT_KEY_MOCK, 11)]
    })

    // check final state and stats state
    await stubbedStore.dispatch('elementalChat/getStats')
    expect((stubbedStore.state.elementalChat.channels).length).toEqual(5)
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(5)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(2)
  })

  it('handles order of incoming/received messages', async () => {
    await store.dispatch('elementalChat/updateProfile', 'Alice')
    const channelId = 1
    const channel = createNewChannel('Channel1', AGENT_KEY_MOCK, channelId)
    await store.dispatch('elementalChat/createChannel', createNewChannel('Channel1', AGENT_KEY_MOCK, channelId))
    const storedChannel = () => store.state.elementalChat.channels[0]
    expect(storedChannel().messages.length).toEqual(0)

    const initialMessages = [
      createMockMessage('11', AGENT_KEY_MOCK, 11),
      createMockMessage('12', AGENT_KEY_MOCK, 12),
      createMockMessage('13', AGENT_KEY_MOCK, 13)
    ]
    // simulate initial messages loaded into channel
    store.commit('elementalChat/addMessagesToChannel', {
      channel,
      messages: initialMessages
    })
    expect(storedChannel().messages.length).toEqual(3)

    const signalMessage = createMockMessage('14', AGENT_KEY_MOCK, 14)
    // simulate a message signal arriving
    await store.dispatch('elementalChat/handleMessageSignal', {
      channelData: channel,
      messageData: signalMessage
    })
    expect(storedChannel().messages.length).toEqual(4)

    const userMessageContent = 'user message'
    // simulate user creating a message
    await store.dispatch('elementalChat/createMessage', {
      channel,
      content: userMessageContent
    })
    expect(storedChannel().messages.length).toEqual(5)

    const newMessages = [
      createMockMessage('15', AGENT_KEY_MOCK, 15),
      createMockMessage('16', AGENT_KEY_MOCK, 16),
      createMockMessage('17', AGENT_KEY_MOCK, 17)
    ]
    // simulate more messages arriving through gossip
    store.commit('elementalChat/addMessagesToChannel', {
      channel,
      messages: newMessages
    })
    expect(storedChannel().messages.length).toEqual(8)

    const knownIds = [...initialMessages, signalMessage, ...newMessages].map(m => m.entry.uuid)
    expect(storedChannel().messages.map(m => m.entry.uuid))
      .toEqual(expect.arrayContaining(knownIds))

    const userCreatedMessage = storedChannel().messages.find(m => !(knownIds).includes(m.entry.uuid))
    expect(userCreatedMessage.entry.content).toContain(userMessageContent)
  })
})
