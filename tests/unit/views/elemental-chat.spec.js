/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll, afterEach */
import Vuetify from 'vuetify'
import Vuex from 'vuex'
import Vue from 'vue'
import { within, waitFor, fireEvent, getByText } from '@testing-library/vue'
import { renderAndWaitFullSetup, handleOneWithMarkup, mountElement, stubElement, mockElement } from '../../test-utils'
import { AGENT_KEY_MOCK, mockWindowRedirect, mockWindowReplace, navigateToNextLocation, windowSpy } from '../../mock-helpers'
import store from '@/store/index'
import { state as chatState, actions as chatActions } from '@/store/elementalChat'
import { state as hcState, actions as hcActions } from '@/store/holochain'
import ElementalChat from '@/ElementalChat.vue'

jest.mock('@/store/callZome')

Vue.use(Vuetify)

describe('ElementalChat with real store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('Renders Correct Page Title', async () => {
    const { getByRole } = await renderAndWaitFullSetup(ElementalChat)
    const title = getByRole('title', { name: /page title/i })
    expect(title).toBeTruthy()
  })

  it('Renders a banner with correct text and link which opens correct page in new tab', async () => {
    const bannerText = 'This is a proof of concept application, not intended for full production use. Read more in our\n '
    const bannerLinkText = 'Elemental Chat FAQs'
    const linkUrl = 'https://holo.host/faq-tag/elemental-chat'

    mockWindowRedirect(linkUrl)

    const { getByRole } = await renderAndWaitFullSetup(ElementalChat)

    const banner = getByRole('banner', { name: /poc banner/i })
    const { getAllByText: getAllByBannerText, getByText: getOneByBannerText } = within(banner)
    const bannerWithText = handleOneWithMarkup(getAllByBannerText, bannerText + bannerLinkText)
    expect(bannerWithText).toBeTruthy()

    const link = handleOneWithMarkup(getOneByBannerText, bannerLinkText)
    await fireEvent.click(link)
    navigateToNextLocation()
    expect(mockWindowReplace).toBeCalledWith(`${linkUrl}/next`)
    windowSpy.mockRestore()
  })

  it('Creates channel and renders channel title in App Bar', async () => {
    const storedChannels = () => store.state.elementalChat.channels
    const channelTitle = 'My first channel'
    const { getByLabelText, getByRole, getAllByRole } = await renderAndWaitFullSetup(ElementalChat)

    const channelInputBox = getByRole('textbox', { name: /channel name/i })
    // const channelInputBox = getByLabelText('Channel Name')
    await fireEvent.update(channelInputBox, channelTitle)
    await fireEvent.keyDown(channelInputBox, { key: 'Enter', code: 'Enter' })

    expect(storedChannels().length).toEqual(1)

    const channelList = getAllByRole('listitem', { name: /channel list items/i })
    expect(channelList.length).toEqual(1)

    const channelSection = getByRole('list', { name: /channel list/i })
    const { getByText: getOneByChannelText } = within(channelSection)
    const channelwithTitle = handleOneWithMarkup(getOneByChannelText, channelTitle)
    expect(channelwithTitle).toBeTruthy()
  })

  it('Displays agent identicon', async () => {
    const { getByRole } = await renderAndWaitFullSetup(ElementalChat)
    const identicon = getByRole('img', { name: /agent identity icon/i })
    expect(identicon).toBeTruthy()
  })
})

// ///////////////// //
// The following tests mock the store and test the following vuex and vue implementation parts :
// 1. correct actions are dispated,
// 2. correct mutations are commitd,
// 3. state is updated correctly,
// 4. getters are referenced properly
// 5. (mocked) state is the current value of the
describe('ElementalChat with store stubs and mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  let channelTitle = 'An amazing new channel'
  let channelId = 0

  const mockAgentState = {
    needsHandle: false,
    agentHandle: 'Alice'
  }

  const emptyChannel = {
    info: { name: '' },
    entry: { category: 'General', uuid: '' },
    messages: [],
    activeChatters: [],
    unseen: false
  }

  const emptyMockChatState = {
    ...chatState,
    stats: {
      agentCount: 0,
      activeCount: 0,
      channelCount: 0,
      messageCount: 0
    },
    // start with empty to mock showingAdd() behavior in channels component on first render
    channels: [emptyChannel],
    currentChannelId: null,
    statsLoading: false
  }

  const mockChannel = (uuid, name, agent) => ({
    info: {
      name,
      created_by: agent
    },
    entry: { category: 'General', uuid },
    messages: [],
    activeChatters: [agent],
    unseen: false
  })

  const getCurrentChannel = chatState => {
    if (chatState.currentChannelId === null) return emptyChannel
    chatState.channels.find(channel => channel.entry.uuid === chatState.currentChannelId)
  }

  const setStubbedStore = (agentState = mockAgentState, chatState = emptyMockChatState, additionalChannels = 0) => {
    const channelsList = chatState.channels
    for (let i; i <= additionalChannels; i++) {
      channelsList.push(mockChannel(i, `Channel #${i}`, agentState.agentHandle || ''))
    }
    const stubbedActions = {
      listChannels: () => Promise.resolve(channelsList),
      ...chatActions,
      ...hcActions
    }
    return new Vuex.Store({
      actions: stubbedActions,
      state: {
        ...agentState,
        errorMessage: ''
      },
      modules: {
        elementalChat: {
          namespaced: true,
          state: chatState,
          getters: {
            channel: () => getCurrentChannel(chatState)
          }
        },
        holochain: {
          namespaced: true,
          state: {
            ...hcState,
            agentKey: AGENT_KEY_MOCK
          }
        }
      }
    })
  }

  it.skip('Displays App Version info', async (done) => {
    const { getByText: getByHoverText, getByRole } = await renderAndWaitFullSetup(ElementalChat)
    const versionInfoBtn = getByRole('button', { name: /app version information/i })
    fireEvent.mouseOver(versionInfoBtn)

    window.requestAnimationFrame(() => {
      // expect(wrapper.find('#tooltip-text').text()).toEqual('example')
      const dnaVersionInfo = getByHoverText('DNA', { exact: false })
      expect(dnaVersionInfo).toBeInTheDocument()
      const uiVersionInfo = getByHoverText('UI', { exact: false })
      expect(uiVersionInfo).toBeInTheDocument()
      done()
    })
  })

  it.only('Renders agent nickname in appbar', async () => {
    mockAgentState.agentHandle = 'Alice Alias'
    const stubbedStore = setStubbedStore(mockAgentState)
    const wrapper = stubElement(ElementalChat, stubbedStore)

    expect(wrapper.is(ElementalChat)).toBe(true)
    expect(wrapper.find('.handle').text()).toBe(mockAgentState.agentHandle)
  })

  it('Displays App Stats when clicked', async () => {
    // Follow up on ID and make see if/how it impact ordering... (order should be alphabetical for channels)
    channelId = 100
    channelTitle = 'Another Alice Channel'
    const mockChatState = {
      ...emptyMockChatState,
      stats: {
        agentCount: 1,
        activeCount: 1,
        channelCount: 1,
        messageCount: 0
      },
      channels: [mockChannel(channelId, channelTitle, mockAgentState.agentHandle)],
      currentChannelId: channelId
    }

    const stubbedStore = setStubbedStore(null, mockChatState)
    const wrapper = stubElement(ElementalChat, stubbedStore)

    expect(wrapper.is(ElementalChat)).toBe(true)
    expect(wrapper.find('.headline').text()).toBe('Stats')
    expect(wrapper.findAll('.display-1').at(3).text()).toBe(mockChatState.stats.activeCount)

    // const { getByText: getByHoverText, getByRole } = await renderAndWaitFullSetup(ElementalChat)
    // const statsInfoBtn = getByRole('button', { name: /view app stats/i })

    // fireEvent.click(statsInfoBtn)
    // const statsModal = await waitFor(() => getByRole('dialog', { name: /"app status model/i }))
    // console.log('stats modal : ', statsModal);
    // const { getByText: getOneByBannerText } = within(statsModal)
    // const statsTitle = handleOneWithMarkup(getOneByBannerText, 'Stats')
    // expect(statsTitle).toBeTruthy()
    // const totalPeersRow = handleOneWithMarkup(getOneByBannerText, 'Total peers:')
    // expect(totalPeersRow).toBeTruthy()
    // const activePeersRow = handleOneWithMarkup(getOneByBannerText, 'Active peers:')
    // expect(activePeersRow).toBeTruthy()
    // const channelsRow = handleOneWithMarkup(getOneByBannerText, 'Channels:')
    // expect(channelsRow).toBeTruthy()
    // const messagesRow = handleOneWithMarkup(getOneByBannerText, 'Messages:')
    // expect(messagesRow).toBeTruthy()
  })

  it('App Stats match store values', async () => {})
})
