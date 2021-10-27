/* global it, describe, expect, beforeAll, afterAll */
import 'regenerator-runtime/runtime.js'
import { wait } from '../test-utils'
import { v4 as uuidv4 } from 'uuid'
import { initializeTryorama } from './setup/tryorama'
import {
  handleZomeCall,
  waitForState,
  findElementsByText,
  findElementsByClassAndText,
  registerNickname,
  getElementProperty,
  awaitZomeResult,
  setupTwoChatters,
  getStats
} from './setup/helpers'
import { TIMEOUT, WAITTIME } from './setup/globals'
import { INSTALLED_APP_ID } from '@/consts'
import { mapValues } from 'lodash'

const callRegistry = {}
const callStats = user => user.call('chat', 'stats', { category: 'General' })
const newChannel = {
  name: 'First Room',
  entry: { category: 'General', uuid: uuidv4() }
}

let closeTryorama,
  aliceChat,
  bobboChat,
  page,
  closeServer,
  newPage,
  expectedStats,
  newStats,
  channelInFocus
beforeAll(async () => {
  const tryorama = await initializeTryorama(
    'some test in two-active-chatters.spec.hc.js'
  )
  const scenario = tryorama.s
  closeTryorama = tryorama.close
  const createPage = () => global.__BROWSER__.newPage()
  let startingStats,
    conductor
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
  ;({
    aliceChat,
    bobboChat,
    page,
    closeServer,
    conductor,
    startingStats
  } = await setupTwoChatters(scenario, createPage, callRegistry))
  expectedStats = startingStats
  console.log('starting stats : ', expectedStats)
  await wait(WAITTIME)
  // scenario setup:
  console.log('Setting up default channel...')
  channelInFocus = await handleZomeCall(aliceChat.call, [
    'chat',
    'create_channel',
    newChannel
  ])
  console.log('starting channel : ', channelInFocus)
  expectedStats = { ...expectedStats, channels: expectedStats.channels + 1 }
  // wait for refresh chatter call response (initiated on page load)
  const checkRefreshChatterState = () => callRegistry['chat.refresh_chatter']
  await waitForState(checkRefreshChatterState, 'done', 'chat.refresh_chatter')
  expectedStats = {
    ...expectedStats,
    agents: expectedStats.agents + 1,
    active: expectedStats.active + 1
  }

  const aliceRunningApps = await conductor
    .adminWs()
    .listApps({ status_filter: { Running: null } })
  if (
    !aliceRunningApps.find(app => app.installed_app_id === INSTALLED_APP_ID)
  ) {
    console.error(
      'Error:',
      INSTALLED_APP_ID,
      'not running. Running apps:',
      aliceRunningApps
    )
    await global.__BROWSER__.close()
    await afterAllSetup(conductor, closeServer)
  }
}, TIMEOUT)

afterAll(async () => {
  await global.__BROWSER__.close()
  if (closeServer) {
    console.log('👉 Closing the UI server...')
    await closeServer()
    console.log('✅ Closed the UI server...')
  }
  if (closeTryorama) {
    await closeTryorama()
  }
})

const checkChannelState = async () => {
  if (expectedStats.channels < 1) {
    await page.click('#refresh')
    await wait(WAITTIME)
  }
}

const checkAgentsState = async () => {
  if (expectedStats.active !== 2) {
    await handleZomeCall(bobboChat.call, ['chat', 'refresh_chatter', null])
    expectedStats = {
      ...expectedStats,
      agents: expectedStats.agents + 1,
      active: expectedStats.active + 1
    }
    await wait(WAITTIME)
  }
}

describe('Two Player Active Chat', () => {
  const webUserNick = 'Alice '

  const newMessage = {
    last_seen: { First: null },
    channel: null,
    chunk: 0,
    entry: {
      uuid: uuidv4(),
      content: 'Hello from Bob, the tryorama node!'
    }
  }
  const newMessageContent = () => newMessage.entry.content

  it('calls refresh_chatter for user on page load ', async () => {
    // verify page title
    const pageTitle = await page.title()
    expect(pageTitle).toBe('Elemental Chat')
    // page has already loaded by now
    newStats = await callStats(aliceChat)
    expect(newStats.active).toEqual(1)
    expectedStats = newStats
  })

  it('displays new channels after pressing refresh button', async () => {
    // alice (web) refreshes channel list
    const refreshChannelButton = await page.$('#refresh')
    await refreshChannelButton.click()
    await wait(WAITTIME)
    // verify new channel is visible on page
    newPage = page
    const elementsWithText = await findElementsByText(
      'div',
      newChannel.name,
      newPage
    )
    const newChannelElement = elementsWithText.pop()
    const newChannelHTML = await getElementProperty(
      newChannelElement,
      'innerHTML'
    )
    expect(newChannelHTML).toContain(newChannel.name)
    // alice clicks on new channel
    await newChannelElement.click()
    await wait(WAITTIME)
  })

  it('creates and displays new channel', async () => {
    await checkChannelState()
    // alice (web user) creates a channel
    newChannel.name = 'Alice Hangout Room'
    await page.click('#add-channel')

    newPage = page
    const channelNameElement = await findElementsByText(
      'div',
      'Channel Name',
      newPage
    )
    const channelInputElement = channelNameElement.pop()
    await channelInputElement.click()
    await page.keyboard.type(newChannel.name, { delay: 100 })
    // press 'Enter' to submit
    page.keyboard.press(String.fromCharCode(13))

    // wait for create call response / load
    const checkNewChannelState = () => callRegistry['chat.create_channel']
    await waitForState(checkNewChannelState, 'done', 'chat.create_channel')

    // check for new channel title on page
    const channels = await page.$eval('.channels-container', el => el.children)
    expect(Object.keys(channels).length).toBe(1)
    newPage = page
    const newChannelElement = await findElementsByClassAndText(
      'div',
      'v-list-item',
      newChannel.name,
      newPage
    )
    const newChannelHTML = await getElementProperty(
      newChannelElement,
      'innerHTML'
    )
    expect(newChannelElement).toBeTruthy()
    expect(newChannelHTML).toContain(newChannel.name)

    // alice (as tryorama node) verifies new channel is in list of channels from the dht
    const { channels: newChannels } = await handleZomeCall(aliceChat.call, [
      'chat',
      'list_channels',
      { category: 'General' }
    ])
    channelInFocus = newChannels.find(
      channel => channel.info.name === newChannel.name
    )
    console.log('New Channel : ', channelInFocus)
    expect(channelInFocus).toBeTruthy()

    newStats = await callStats(aliceChat)
    expect(newStats).toEqual({
      ...expectedStats,
      channels: expectedStats.channels + 1
    })
    expectedStats = newStats
  })

  it('displays correct stats before and after new chatter', async () => {
    await checkChannelState()

    // alice (web) clicks on get-stats
    const stats = await getStats(page)
    console.log('Stats prior to second agent: ', stats)

    // assert that we find the right stats
    expect(mapValues(stats, Number)).toEqual(expectedStats)

    // bobbo (tryorama node) declares self as chatter
    await handleZomeCall(bobboChat.call, ['chat', 'refresh_chatter', null])
    await wait(WAITTIME)

    const stats2 = await getStats(page)
    console.log('Stats after second agent: ', stats2)

    expectedStats = {
      ...expectedStats,
      agents: expectedStats.agents + 1,
      active: expectedStats.active + 1
    }

    // assert that we find the right stats
    expect(mapValues(stats2, Number)).toEqual(expectedStats)

    await wait(WAITTIME)
  })

  it('creates and displays new message', async () => {
    await checkChannelState()
    newPage = page
    const elementsWithText = await findElementsByText(
      'div',
      newChannel.name,
      newPage
    )
    const newChannelElement = elementsWithText.pop()
    await newChannelElement.click()
    await wait(WAITTIME)

    // new message
    newMessage.channel = channelInFocus.entry
    newMessage.entry.content =
      'Hello from Alice, the native holochain user on the shared network. :)'

    // alice (web) sends a message
    await page.focus('textarea')
    await page.keyboard.type(newMessageContent(), { delay: 100 })
    // press 'Enter' to submit
    page.keyboard.press(String.fromCharCode(13))

    const checkNewMessageState = () => callRegistry['chat.create_message']
    await waitForState(
      checkNewMessageState,
      'done',
      'chat.create_message',
      () => callRegistry
    )

    // bobbo (tryorama node) verifies new message is in list of messages from the dht
    const createNewMessage = async () =>
      await handleZomeCall(bobboChat.call, [
        'chat',
        'list_messages',
        {
          channel: channelInFocus.entry,
          active_chatter: true,
          chunk: { start: 0, end: 1 }
        }
      ])
    const { messages } = await awaitZomeResult(createNewMessage, 90000, 10000)
    console.log('message list : ', messages)
    expect(messages[0].entry.content).toContain(newMessageContent())

    // check for new message content is on page
    newPage = page
    const [newMessageElement] = await findElementsByText(
      'li',
      newMessageContent(),
      newPage
    )
    expect(newMessageElement).toBeTruthy()
    const newMessageHTML = await getElementProperty(
      newMessageElement,
      'innerHTML'
    )
    expect(newMessageHTML).toContain(newMessageContent())
    expect(newMessageHTML).toContain(webUserNick)

    await wait(WAITTIME)

    // bobbo checks stats after message
    newStats = await handleZomeCall(bobboChat.call, [
      'chat',
      'stats',
      { category: 'General' }
    ])
    expect(newStats).toEqual({
      ...expectedStats,
      messages: expectedStats.messages + 1
    })
    expectedStats = newStats
  })

  it('displays channels created by another agent', async () => {
    await checkChannelState()
    await checkAgentsState()
    newChannel.name = 'Bobbo Collaboration Room'
    newChannel.entry.uuid = uuidv4()

    // bobbo (tryorama node) creates channel
    // **creating channel at tryorama level - simulating channel created by another agent
    channelInFocus = await handleZomeCall(bobboChat.call, [
      'chat',
      'create_channel',
      newChannel
    ])
    // bobbo checks stats
    newStats = await callStats(bobboChat)
    expect(newStats).toEqual({
      ...expectedStats,
      channels: expectedStats.channels + 1
    })
    expectedStats = newStats

    // alice (web) refreshes channel list
    const newChannelButton = await page.$('#refresh')
    await newChannelButton.click()

    await wait(WAITTIME)

    // alice makes sure the channel exists first
    let newChannelText
    try {
      newChannelText = await page.waitForFunction(
        newChannelTitle =>
          document.querySelector('body').innerText.includes(newChannelTitle),
        {},
        newChannel.name
      )
      console.log(
        `Successfully found new Channel (${newChannel.name}) on the page`
      )
    } catch (e) {
      console.log(
        `The new Channel (${newChannel.name}) was not found on the page`
      )
      newChannelText = null
    }
    expect(newChannelText).toBeTruthy()
  })

  it('displays a signal message', async () => {
    await checkChannelState()
    await checkAgentsState()
    // bobbo checks channels
    const { channels } = await handleZomeCall(bobboChat.call, [
      'chat',
      'list_channels',
      { category: 'General' }
    ])
    console.log('channel list', channels)
    channelInFocus = channels.find(
      channel => channel.info.name === newChannel.name
    )

    // bobbo creates new message on channel
    newMessage.channel = channelInFocus.entry
    newMessage.entry.content = 'Hello from Bob, the Tryorama player.'
    newMessage.entry.uuid = uuidv4()
    const messageResponse = await handleZomeCall(bobboChat.call, [
      'chat',
      'create_message',
      newMessage
    ])
    expect(messageResponse.entry).toEqual(newMessage.entry)

    // bobbo sends signal
    const signalMessageData = {
      messageData: messageResponse,
      channelData: channelInFocus
    }
    const signalResult = await handleZomeCall(bobboChat.call, [
      'chat',
      'signal_chatters',
      signalMessageData
    ])
    console.log('signal result', signalResult)
    expect(signalResult.sent.length).toEqual(1)

    // alice clicks on new channel with new message
    newPage = page
    const elementsWithText = await findElementsByText(
      'div',
      newChannel.name,
      newPage
    )
    const newChannelElement = elementsWithText.pop()
    await newChannelElement.click()

    // alice (node) verifies new message is in list of messages from the dht
    const createNewMessage = async () =>
      await handleZomeCall(aliceChat.call, [
        'chat',
        'list_messages',
        {
          channel: channelInFocus.entry,
          active_chatter: true,
          chunk: { start: 0, end: 1 }
        }
      ])
    const { messages } = await awaitZomeResult(createNewMessage, 90000, 10000)
    expect(messages[0].entry.content).toContain(newMessageContent())

    // alice checks for new message content on page
    newPage = page
    const newMessageElements = await findElementsByText(
      'li',
      newMessageContent(),
      newPage
    )
    expect(newMessageElements[0]).toBeTruthy()
    const newMessageHTML = await getElementProperty(
      newMessageElements[0],
      'innerHTML'
    )
    expect(newMessageHTML).toContain(newMessageContent())

    // bobbo checks stats
    newStats = await callStats(bobboChat)
    expect(newStats).toEqual({
      ...expectedStats,
      messages: expectedStats.messages + 1
    })
    expectedStats = newStats
  })

  it('displays new messages after pressing refresh button', async () => {
    await checkChannelState()
    newMessage.channel = channelInFocus.entry
    newMessage.entry.uuid = uuidv4()
    newMessage.entry.content = 'Hello, there! Nice to speak with you.'

    // alice (node) creates channel - which will not display on ui but will be logged in chain
    const messageResponse = await handleZomeCall(aliceChat.call, [
      'chat',
      'create_message',
      newMessage
    ])
    expect(messageResponse.entry).toEqual(newMessage.entry)

    // alice (web) refreshes channel list to fetch all messages
    const refreshChannelButton = await page.$('#refresh')
    await refreshChannelButton.click()
    await wait(WAITTIME)

    // verify new message is visible on page
    const newPage = page
    const [newMessageElement2] = await findElementsByText(
      'li',
      newMessageContent(),
      newPage
    )
    expect(newMessageElement2).toBeTruthy()
    const newMessage2HTML = await getElementProperty(
      newMessageElement2,
      'innerHTML'
    )
    expect(newMessage2HTML).toContain(newMessageContent())

    // bobbo checks stats
    newStats = await callStats(bobboChat)
    expect(newStats).toEqual({
      ...expectedStats,
      messages: expectedStats.messages + 1
    })
    expectedStats = newStats
  })

  it('handles updating agent handle', async () => {
    await page.click('#update-handle')
    await wait(WAITTIME)
    const [dialog] = await page.$$('.v-dialog')
    const elementsWithText = await findElementsByText(
      'div',
      'Enter your handle',
      dialog
    )
    const updateHandleInput = elementsWithText.pop()
    expect(updateHandleInput).toBeTruthy()
    await updateHandleInput.click()
    // add agent nickname
    newPage = page
    await registerNickname(newPage, 'Alice Alias')
    await wait(WAITTIME)
  })
})
