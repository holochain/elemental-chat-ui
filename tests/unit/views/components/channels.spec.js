/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { within, fireEvent } from '@testing-library/vue'
import store from '@/store/index'
import { renderAndWaitFullSetup, handleOneWithMarkup, stubElement } from '../../../test-utils'
import { resetHolochainState, mockAgentState, resetAgentState, mockChatState as defaultChatState, resetChatState, createMockChannel, setStubbedStore, createNewChannel } from '../../../mock-helpers'
import Channels from '@/components/Channels.vue'
import Vuetify from 'vuetify'
import Vue from 'vue'

Vue.use(Vuetify)

describe('Channels with real store', () => {
  let channelTitle
  const storedChannelList = () => store.state.elementalChat.channels

  beforeAll(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('creates a new channel', async () => {
    const { getByLabelText, getByRole } = await renderAndWaitFullSetup(Channels)
    channelTitle = 'First Chanel Room'
    const channelInputBox = getByLabelText('Channel Name')
    expect(channelInputBox).toBeTruthy()
    expect(storedChannelList().length).toEqual(0)
    await fireEvent.update(channelInputBox, channelTitle)
    await fireEvent.keyDown(channelInputBox, { key: 'Enter', code: 'Enter' })
    const channelList = getByRole('list', { name: /channel list/i })
    const { getByText: getOneByBannerText } = within(channelList)
    const channelText = handleOneWithMarkup(getOneByBannerText, channelTitle)
    expect(channelText).toBeTruthy()
    expect(storedChannelList().length).toEqual(1)
  })

  it('displays list of channels', async () => {
    const { getByRole } = await renderAndWaitFullSetup(Channels)
    expect(storedChannelList().length).toEqual(0)

    channelTitle = 'Next Chanel Room'
    await store.dispatch('elementalChat/createChannel', createNewChannel(channelTitle))

    channelTitle = 'Another Chanel Room'
    await store.dispatch('elementalChat/createChannel', createNewChannel(channelTitle))

    const channelList = getByRole('list', { name: /channel list/i })
    const { getByText: getOneByBannerText } = within(channelList)
    const channelText = handleOneWithMarkup(getOneByBannerText, channelTitle)
    expect(channelText).toBeTruthy()
    expect(storedChannelList().length).toEqual(3)
  })
})

describe('Channels with store stubs and mocks', () => {
  beforeAll(() => {
    mockAgentState.needsHandle = false
    mockAgentState.agentHandle = 'Alice'
  })
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })
  afterAll(() => {
    resetAgentState()
    resetHolochainState()
    resetChatState()
  })

  it('displays the + sign whenever a new channel appears', async () => {})
})
