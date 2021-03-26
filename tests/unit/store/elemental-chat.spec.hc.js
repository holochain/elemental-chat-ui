/* global jest, it, describe, expect, beforeEach */
import { getStubbedStore } from '../../mock-helpers'
import Vuex from 'vuex'
import { createLocalVue } from '@vue/test-utils'
import store from '@/store/index'

jest.mock('@/store/callZome')

const makeChannel = (uuid, name) => ({
  info: {
    name,
    created_by: ''
  },
  entry: { category: 'General', uuid },
  messages: [],
  last_seen: {}
})

const makeMessage = (uuid, content) => ({
  createdBy: '',
  entry: { content, uuid },
  messages: [],
  createdAt: [0, 0]
})

describe('elementalChat store', () => {
  let stubbedStore
  beforeEach(async () => {
    createLocalVue().use(Vuex)
    stubbedStore = getStubbedStore()
  })

  it('manages storeChannelUnseen count', async () => {
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(null)
    await stubbedStore.dispatch('elementalChat/createChannel', makeChannel(1, 'Channel1'))
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(1)
    await stubbedStore.dispatch('elementalChat/createChannel', makeChannel(2, 'Channel2'))
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
      messages: [makeMessage(11, 'new message')]
    })
    expect(stubbedStore.state.elementalChat.channels[0].unseen).toEqual(false)
    expect(stubbedStore.state.elementalChat.channels[1].unseen).toEqual(true)
    expect(stubbedStore.state.elementalChat.channels[2].unseen).toEqual(false)
  })

  it('manages getstoredStats content', async () => {
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(2)
    await stubbedStore.dispatch('elementalChat/createChannel', makeChannel(3, 'Channel1'))
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(3)
    await stubbedStore.dispatch('elementalChat/createChannel', makeChannel(4, 'Channel2'))
    expect(stubbedStore.state.elementalChat.currentChannelId).toEqual(4)
    // Check the initial stats state
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(3)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(0)

    await stubbedStore.dispatch('elementalChat/getStats')
    // channelCount is 3 because we just added two and had one in state from the mock
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(5)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(1)

    stubbedStore.commit('elementalChat/addMessagesToChannel', {
      channelId: 4,
      messages: [makeMessage(11, 'new message')]
    })

    await stubbedStore.dispatch('elementalChat/getStats')
    expect(stubbedStore.state.elementalChat.stats.channelCount).toEqual(5)
    expect(stubbedStore.state.elementalChat.stats.messageCount).toEqual(2)
  })

  it('handles order of incoming/received messages', async () => {
    const channelId = 1
    const channel = makeChannel(channelId, 'Channel1')
    await store.dispatch('elementalChat/createChannel', makeChannel(channelId, 'Channel1'))
    const storedChannel = () => store.state.elementalChat.channels[0]
    expect(storedChannel().messages.length).toEqual(0)

    const initialMessages = [
      makeMessage(11, '11'),
      makeMessage(12, '12'),
      makeMessage(13, '13')
    ]
    // simulate initial messages loaded into channel
    store.commit('elementalChat/addMessagesToChannel', {
      channelId,
      messages: initialMessages
    })
    expect(storedChannel().messages.length).toEqual(3)

    const signalMessage = makeMessage(14, '14')
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
      makeMessage(15, '15'),
      makeMessage(16, '16'),
      makeMessage(17, '17')
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