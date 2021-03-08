/* global jest, it, describe, expect */

import store from '../index'

jest.mock('../callZome')

const makeChannel = (uuid, name) => ({
  info: {
    name,
    created_by: ''
  },
  channel: { category: 'General', uuid },
  messages: [],
  last_seen: {}
})

const makeMessage = (uuid, content) => ({
  createdBy: '',
  message: { content, uuid },
  messages: [],
  createdAt: [0, 0]
})

describe('elementalChat store', () => {
  it('yam', async () => {
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

    const knownIds = [...initialMessages, signalMessage, ...newMessages].map(m => m.message.uuid)

    expect(storedChannel().messages.map(m => m.message.uuid))
      .toEqual(expect.arrayContaining(knownIds))

    const userCreatedMessage = storedChannel().messages.find(m => !(knownIds).includes(m.message.uuid))

    expect(userCreatedMessage.message.content).toContain(userMessageContent)
  })
})
