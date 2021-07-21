/* global jest, it, describe, expect, beforeEach */
import { getStubbedStore, createNewChannel, createNewMessage, AGENT_KEY_MOCK } from '../../mock-helpers'
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
    await stubbedStore.dispatch('elementalChat/createChannel', createNewChannel('Channel1', AGENT_KEY_MOCK, 1))
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
      channelId: 1,
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
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(3)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(0)

    // add two channels
    await stubbedStore.dispatch('elementalChat/createChannel', createNewChannel('Channel1', AGENT_KEY_MOCK, 3))
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(3)
    await stubbedStore.dispatch('elementalChat/createChannel', createNewChannel('Channel2', AGENT_KEY_MOCK, 4))
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(4)

    // check updated state and stats state
    await stubbedStore.dispatch('elementalChat/getStats')
    // channelCount is 3 because we just added two and had one in state from the mock
    expect((stubbedStore.state.elementalChat.channels).length).toEqual(5)
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(5)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(1)

    // add messages to channel
    stubbedStore.commit('elementalChat/addMessagesToChannel', {
      channelId: 4,
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
      createNewMessage('11', AGENT_KEY_MOCK, 11),
      createNewMessage('12', AGENT_KEY_MOCK, 12),
      createNewMessage('13', AGENT_KEY_MOCK, 13)
    ]
    // simulate initial messages loaded into channel
    store.commit('elementalChat/addMessagesToChannel', {
      channelId,
      messages: initialMessages
    })
    expect(storedChannel().messages.length).toEqual(3)

    const signalMessage = createNewMessage('14', AGENT_KEY_MOCK, 14)
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
      createNewMessage('15', AGENT_KEY_MOCK, 15),
      createNewMessage('16', AGENT_KEY_MOCK, 16),
      createNewMessage('17', AGENT_KEY_MOCK, 17)
    ]
    // simulate more messages arriving through gossip
    store.commit('elementalChat/addMessagesToChannel', {
      channelId,
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
