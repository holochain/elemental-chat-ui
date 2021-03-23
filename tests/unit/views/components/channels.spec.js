/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { within, fireEvent } from '@testing-library/vue'
import store from '@/store/index'
import { renderAndWaitFullSetup, handleOneWithMarkup, stubElement } from '../../../test-utils'
import { resetHolochainState, mockAgentState, resetAgentState, resetChatState, mockChatState, setStubbedStore, createNewChannel, createMockChannel } from '../../../mock-helpers'
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
  let stubbedStore
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

  it('Renders agent nickname in appbar', async () => {
    const unseenChannel = createMockChannel('My favorite channel', 'Alice', '101', true)
    const stubbedChatState = {
      channels: [unseenChannel],
      currentChannelId: unseenChannel.entry.uuid,
      stats: {
        agentCount: 1,
        activeCount: 1,
        channelCount: 1,
        messageCount: 0
      },
      statsLoading: false
    }
    stubbedStore = setStubbedStore(mockAgentState, mockChatState, stubbedChatState)
    const wrapper = stubElement(Channels, stubbedStore)
    expect(wrapper.is(Channels)).toBe(true)
    const channelListItem = wrapper.findAll('[aria-label="Channel List-Items"]').at(1)
    expect(channelListItem.text()).toContain('+')
  })
})
