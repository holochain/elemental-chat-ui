/* global jest, it, describe, expect, beforeAll */
import { within, fireEvent } from '@testing-library/vue'
import { renderAndWaitFullSetup, handleOneWithMarkup } from '../../../test-utils'
import { createNewChannel, createNewMessage } from '../../../mock-helpers'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Messages from '@/components/Messages.vue'
import store from '@/store/index'

jest.mock('@/store/callZome')

Vue.use(Vuetify)

describe('Messages with real store', () => {
  let channelTitle
  const storedChannel = () => store.state.elementalChat.channels[0]

  beforeAll(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('creates a new message within new channel', async () => {
    // create channel
    channelTitle = 'Music Room'
    await store.dispatch('elementalChat/createChannel', createNewChannel(channelTitle))
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
    const messageText = handleOneWithMarkup(getOneByBannerText, newMessageContent)
    expect(messageText).toBeTruthy()
    expect(storedChannel().messages.length).toEqual(1)
  })

  it('displays a list of messages', async () => {
    const { getByLabelText, getByRole } = await renderAndWaitFullSetup(Messages)
    const messageInputBox = getByLabelText('Send a message')
    const messageList = getByRole('list', { name: /message list/i })

    // create two more messages in channel
    // create additional message #1 on channel
    const additionalMessageContent1 = 'Alice: Hey hey!'
    expect(additionalMessageContent1).toBeTruthy()
    await fireEvent.update(messageInputBox, additionalMessageContent1)
    await fireEvent.keyDown(messageInputBox, { key: 'Enter', code: 'Enter' })
    // create additional message #2 on channel
    const additionalMessageContent2 = 'Alice: Anyone here?'
    expect(additionalMessageContent2).toBeTruthy()
    await fireEvent.update(messageInputBox, additionalMessageContent2)
    await fireEvent.keyDown(messageInputBox, { key: 'Enter', code: 'Enter' })

    const { getByText: getOneByBannerText } = within(messageList)
    const firstMessageText = handleOneWithMarkup(getOneByBannerText, additionalMessageContent1)
    expect(firstMessageText).toBeTruthy()
    const secondMessageText = handleOneWithMarkup(getOneByBannerText, additionalMessageContent2)
    expect(secondMessageText).toBeTruthy()
    expect(storedChannel().messages.length).toEqual(3)
  })
})
