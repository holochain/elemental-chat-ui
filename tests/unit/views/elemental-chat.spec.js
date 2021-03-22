/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import Vuetify from 'vuetify'
import Vue from 'vue'
import { within, waitFor, fireEvent } from '@testing-library/vue'
import { renderAndWaitFullSetup, handleOneWithMarkup, stub, stubElement } from '../../test-utils'
import { DNA_VERSION_MOCK, mockHolochainState, resetHolochainState, mockAgentState, resetAgentState, mockChatState as defaultChatState, resetChatState, createMockChannel, setStubbedStore, mockWindowRedirect, mockWindowReplace, navigateToNextLocation, windowSpy } from '../../mock-helpers'
import store from '@/store/index'
import ElementalChat from '@/ElementalChat.vue'
import wait from 'waait'

jest.mock('@/store/callZome')

Vue.use(Vuetify)

describe('ElementalChat with real store', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('Displays correct page title', async () => {
    const { getByRole } = await renderAndWaitFullSetup(ElementalChat)
    const title = getByRole('title', { name: /page title/i })
    expect(title).toBeTruthy()
  })

  it('Displays a banner with correct text and link which opens correct page in new tab', async () => {
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

  it('Creates channel and displays channel title in App Bar', async () => {
    const storedChannels = () => store.state.elementalChat.channels
    const channelTitle = 'My first channel'
    const { getByLabelText, getByRole, getAllByRole } = await renderAndWaitFullSetup(ElementalChat)
    const channelInputBox = getByLabelText('Channel Name')
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

  // TODO: determine how to access tooltip contents
  it.skip('Displays App info on Hover', async (done) => {
    const { getByText: getByHoverText, getByRole } = await renderAndWaitFullSetup(ElementalChat)
    const versionInfoBtn = getByRole('button', { name: /app version button/i })
    fireEvent.mouseOver(versionInfoBtn)
    window.requestAnimationFrame(() => {
      const dnaVersionInfo = getByHoverText('DNA', { exact: false })
      expect(dnaVersionInfo).toBeInTheDocument()
      const uiVersionInfo = getByHoverText('UI', { exact: false })
      expect(uiVersionInfo).toBeInTheDocument()
      done()
    })
  })

  it.skip('Displays App Stats Dialog when clicked', async () => {
    const { getByRole, debug } = await renderAndWaitFullSetup(ElementalChat)
    const statsInfoBtn = getByRole('button', { name: /view app stats/i })
    fireEvent.click(statsInfoBtn)
    await wait(2000)
    console.log('\n\n\n')
    // why is element debug cuttoff at end?
    debug()
    console.log('\n\n\n')
    const statsModal = await waitFor(() => getByRole('dialog', { name: /"app statistics dialog/i }))
    debug(statsModal)
    expect(statsModal).toBeTruthy()
  })
})

describe('ElementalChat with store stubs and mocks', () => {
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

  it('Renders agent nickname in appbar', async () => {
    const newAgentNickame = 'Alice Alias'
    stubbedStore = setStubbedStore({
      needsHandle: false,
      agentHandle: newAgentNickame
    })
    const wrapper = stubElement(ElementalChat, stubbedStore)
    expect(wrapper.is(ElementalChat)).toBe(true)
    expect(wrapper.find('[aria-label="Agent Handle"]').text()).toBe(newAgentNickame)
  })
  // /////////////////
  // TODO: Determine if possible to test via USING TESTING LIBRARY, VUEX STUBS, & JEST MOCKS approach
  // Using example above, there is an issue with mocking the getter fn ..discover how jest wants getter.channel mock to be passed (see setStubbedStore to mock getter fns)
  it.skip('Renders agent nickname in appbar', async () => {
    const newAgentNickame = 'Alice Alias'
    const stubbedComponents = ['Channels', 'Messages', 'Identicon']
    // const stubbedComponents = {
    //   Channels: "<div class='stub'></div>",
    //   Messages: "<div class='stub'></div>",
    //   Identicon: "<div class='stub'></div>"
    // }
    const stubbedStore = setStubbedStore({
      needsHandle: false,
      agentHandle: newAgentNickame
    })
    const { getByText, debug } = await stub(ElementalChat, stubbedComponents, stubbedStore)
    debug()
    const agentHandle = getByText(newAgentNickame)
    expect(agentHandle).toBeInDocument()
  })

  // follows the same approach as above
  it.skip('Renders logout button when in holo hosting environment', async () => {
    mockHolochainState.isHoloSignedIn = true
    stubbedStore = setStubbedStore()
    const stubbedComponents = ['Channels', 'Messages', 'Identicon']
    const { getByText, debug } = await stub(ElementalChat, stubbedComponents, stubbedStore)
    debug()
    const logoutButton = getByText('Logout')
    expect(logoutButton).toBeInDocument()
  })
  // ////////////////////

  it('Renders correct app version info', async () => {
    // mockHolochainState.dnaHash = null
    stubbedStore = setStubbedStore()
    let wrapper = stubElement(ElementalChat, stubbedStore)
    expect(wrapper.is(ElementalChat)).toBe(true)

    const uiVersion = wrapper.find('[aria-label="App UI Version Info"]')
    const dnaVersion = wrapper.find('[aria-label="App DNA Version Info"]')

    // TODO: Follow-up on why the v-if doesn't make this element invisible when the dnaHash is null
    // expect(uiVersion.element).not.toBeVisible()
    // expect(dnaVersion.element).not.toBeVisible()

    // resetHolochainState()
    // stubbedStore = setStubbedStore()
    // wrapper = stubElement(ElementalChat, stubbedStore)
    // const updatedUiVersion = wrapper.find('[aria-label="App UI Version Info"]')
    // const updateddnaVersion = wrapper.find('[aria-label="App DNA Version Info"]')

    expect(uiVersion.element).toBeVisible()
    expect(dnaVersion.element).toBeVisible()

    expect(uiVersion.text()).toBe(`UI: ${process.env.VUE_APP_UI_VERSION}`)
    expect(dnaVersion.text()).toBe(`DNA: ...${DNA_VERSION_MOCK.slice(DNA_VERSION_MOCK.length - 6)}`)
  })

  it('Renders correct app stats', async () => {
    channelId = 100
    channelTitle = 'Another Alice Channel'
    const mockChatState = {
      ...defaultChatState,
      stats: {
        agentCount: 1,
        activeCount: 1,
        channelCount: 1,
        messageCount: 0
      },
      channels: [createMockChannel(channelId, channelTitle, mockAgentState.agentHandle)],
      currentChannelId: channelId
    }
    const stubbedStore = setStubbedStore(null, null, mockChatState)
    const wrapper = stubElement(ElementalChat, stubbedStore)
    expect(wrapper.is(ElementalChat)).toBe(true)
    expect(wrapper.find('[aria-label="App Statistics Headline"]').text()).toBe('Stats')
    expect(wrapper.find('[aria-label="App Total Peers"]').text()).toBe(mockChatState.stats.agentCount.toString())
    expect(wrapper.find('[aria-label="App Active Peers"]').text()).toBe(mockChatState.stats.activeCount.toString())
    expect(wrapper.find('[aria-label="App Total Channels"]').text()).toBe(mockChatState.stats.channelCount.toString())
    expect(wrapper.find('[aria-label="App Total Messages"]').text()).toBe(mockChatState.stats.messageCount.toString())
  })
})
