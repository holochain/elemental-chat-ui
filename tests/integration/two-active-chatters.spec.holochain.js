/* global it, describe, expect, beforeAll, afterAll */
import 'regenerator-runtime/runtime.js'
import wait from 'waait'
import { v4 as uuidv4 } from 'uuid'
import { orchestrator } from './setup/tryorama'
import { waitForState, awaitZomeResult, findElementByText, findElementByClassandText, getElementProperty, registerNickname, beforeAllSetup, afterAllSetup } from './setup/helpers'
import { TIMEOUT, WAITTIME } from './setup/globals'
import { INSTALLED_APP_ID } from '@/consts'

// TEMPORARY: Remove and reset this extended waittime after hc header issue is resolved
const EXTENDED_WAITTIME = WAITTIME + 3000

orchestrator.registerScenario('Two Active Chatters', async scenario => {
  const callRegistry = {}
  const callStats = async () => await aliceChat.call('chat', 'stats', { category: 'General' })
  const newChannel = {
    name: 'First Room',
    entry: { category: 'General', uuid: uuidv4() }
  }
  
  let aliceChat, bobboChat, page, closeServer, conductor, newPage, stats, newStats, channelInFocus
  beforeAll(async () => {
    const createPage = async () => await global.__BROWSER__.newPage();
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
    ({ aliceChat, bobboChat, page, closeServer, conductor } = await beforeAllSetup(scenario, createPage, callRegistry))
    await wait(EXTENDED_WAITTIME)
    // scenario setup:
    console.log('Setting up default channel...')
    channelInFocus = await aliceChat.call('chat', 'create_channel', newChannel)
    console.log('Verifying initial stats...', channelInFocus)
    stats = await awaitZomeResult(callStats, 90000, 10000)
    console.log('starting stats : ', stats)
    expect(stats).toEqual({ agents: 1, active: 1, channels: 1, messages: 0 })
  }, TIMEOUT)
  afterAll(async () => {
    await afterAllSetup(conductor, closeServer)
  })
  
  describe('Two Player Active Chat', () => {
    const webUserNick = 'Alice '

    const newChannelTitle = () => newChannel.name
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

    it('references correct app Id', async () => {
      // confirm app is installed with correct app id
      const installedApps = await conductor.adminWs().listActiveApps()
      expect(installedApps).toContain(INSTALLED_APP_ID)
    })

    it('registers nickname', async () => {
      newPage = page
      registerNickname(newPage, webUserNick)
      await wait(WAITTIME)
    })

    it('displays new channels after pressing refresh button', async () => {
      // alice (web) refreshes channel list to fetch all messages
      const refreshChannelButton = await page.$('#refresh')
      await refreshChannelButton.click()
      await wait(WAITTIME)

      // verify new message is visible on page
      newPage = page
      const elementsWithText = await findElementByText('div', newChannelTitle(), newPage)
      const newChannelElement = elementsWithText.pop()
      const newChannelHTML = await getElementProperty(newChannelElement, 'innerHTML')
      expect(newChannelHTML).toContain(newChannelTitle())
      // alice clicks on new channel
      await newChannelElement.click()
      await wait(WAITTIME)
    })

    it('creates and displays new channel', async () => {
      // alice (web user) creates a channel
      newChannel.name = 'Alice Hangout Room'
      await page.click('#add-channel')

      newPage = page
      const channelNameElement = await findElementByText('div', 'Channel Name', newPage)
      const channelInputElement = channelNameElement.pop()
      await channelInputElement.click()
      await page.keyboard.type(newChannelTitle(), { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))

      // wait for create call response / load
      const checkNewChannelState = () => callRegistry['chat.create_channel']
      await waitForState(checkNewChannelState, 'done')

      // check for new channel title on page
      const channels = await page.$eval('.channels-container', el => el.children)
      expect(Object.keys(channels).length).toBe(1)
      newPage = page
      const newChannelElement = await findElementByClassandText('div', 'v-list-item', newChannelTitle(), newPage)
      const newChannelHTML = await getElementProperty(newChannelElement, 'innerHTML')
      expect(newChannelElement).toBeTruthy()
      expect(newChannelHTML).toContain(newChannelTitle())

      // alice (as tryorama node) verifies new message is in list of messages from the dht
      const callListChannels = async () => await aliceChat.call('chat', 'list_channels', { category: 'General' })
      const { channels: newChannels } = await awaitZomeResult(callListChannels, 90000, 10000)
      channelInFocus = newChannels.find(channel => channel.info.name === newChannelTitle())
      console.log('New Channel : ', channelInFocus)
      expect(channelInFocus).toBeTruthy()

      newStats = await awaitZomeResult(callStats, 90000, 10000)
      expect(newStats).toEqual({ ...stats, channels: stats.channels + 1 })
      stats = newStats
    })

    it('displays correct stats before and after new chatter', async () => {
      const checkVisualStats = async (statArray, element) => {
        const stats = statArray
        for (const e in element) {
          try {
            const text = await (await element[e].getProperty('textContent')).jsonValue()
            stats.push(text)
          } catch(e) {
            console.log('error: ', e)
            continue
          }
        }
        return stats
      }

      // alice (web) clicks on get-stats
      await page.click('#get-stats')
      await wait(WAITTIME)
      let element = await page.$$('.display-1')
      let texts = await checkVisualStats([], element)
      console.log('Stats prior to second agent: ', texts)

      // assert that we find the right stats
      expect(texts[1]).toContain(stats.agents)
      expect(texts[3]).toContain(stats.active)
      expect(texts[5]).toContain(stats.channels)
      expect(texts[7]).toContain(stats.messages)

      const [closeButton] = await findElementByText('button', 'Close', page)
      await closeButton.click()

      // bobbo (tryorama node) declares self as chatter
      await bobboChat.call('chat', 'refresh_chatter', null)
      await wait(EXTENDED_WAITTIME)

      await page.click('#get-stats')
      await wait(WAITTIME)
       // reset element to evaluate
      element = await page.$$('.display-1')
      texts = await checkVisualStats([], element)      
      console.log('Stats after second agent: ', texts)

      // assert that we find the right stats
      expect(texts[1]).toContain(stats.agents + 1)
      expect(texts[3]).toContain(stats.active + 1)
      expect(texts[5]).toContain(stats.channels)
      expect(texts[7]).toContain(stats.messages)

      await page.click('#close-stats')
      stats = { ...stats, agents: stats.agents + 1, active: stats.active + 1 }
      await wait(WAITTIME)
    })

    it('creates and displays new message', async () => {
      newPage = page
      const elementsWithText = await findElementByText('div', newChannelTitle(), newPage)
      const newChannelElement = elementsWithText.pop()
      await newChannelElement.click()

      await wait(WAITTIME)

      // new message
      newMessage.channel =  channelInFocus.entry
      newMessage.entry.content = 'Hello from Alice, the native holochain user on the shared network. :)'

      // alice (web) sends a message
      await page.focus('textarea')
      await page.keyboard.type(newMessageContent(), { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))

      await wait(WAITTIME)

      // bobbo (tryorama node) verifies new message is in list of messages from the dht
      const callListMessages = async () => await bobboChat.call('chat', 'list_messages', { channel: channelInFocus.entry, active_chatter: true, chunk: { start: 0, end: 1 } })
      const { messages } = await awaitZomeResult(callListMessages, 90000, 10000)
      console.log('message list : ', messages)
      expect(messages[0].entry.content).toContain(newMessageContent())

      const checkNewMessageState = () => callRegistry['chat.create_message']
      await waitForState(checkNewMessageState, 'done')

      // check for new message content is on page
      newPage = page
      const [newMessageElement] = await findElementByText('li', newMessageContent(), newPage)
      expect(newMessageElement).toBeTruthy()
      const newMessageHTML = await getElementProperty(newMessageElement, 'innerHTML')
      expect(newMessageHTML).toContain(newMessageContent())
      expect(newMessageHTML).toContain(webUserNick)

      // bobbo checks stats after message
      newStats = await bobboChat.call('chat', 'stats', { category: 'General' })
      expect(newStats).toEqual({ ...stats, messages: stats.messages + 1 })
      stats = newStats
    })

    it('displays channels created by another agent', async () => {
      newChannel.name = 'Bobbo Collaboration Room'
      newChannel.entry.uuid = uuidv4() 

      if (stats.active !== 2) {
        await bobboChat.call('chat', 'refresh_chatter', null)
        await wait(EXTENDED_WAITTIME)
      }

      // bobbo (tryorama node) creates channel 
      // **creating channel at tryrama level to simulate channel created by another agent
      channelInFocus = await bobboChat.call('chat', 'create_channel', newChannel)
      // bobbo checks stats
      newStats = await bobboChat.call('chat', 'stats', { category: 'General' })
      expect(newStats).toEqual({ ...stats, channels: stats.channels + 1 })
      stats = newStats

      // alice (web) refreshes channel list
      const newChannelButton = await page.$('#refresh')
      await newChannelButton.click()

      await wait(WAITTIME)

      // alice makes sure the channel exists first
      let newChannelText
      try {
        newChannelText = await page.waitForFunction(
          newChannelTitle => document.querySelector('body').innerText.includes(newChannelTitle),
          {},
          newChannelTitle()
        )
        console.log(`Successfully found new Channel (${newChannelTitle()}) on the page`)
      } catch (e) {
        console.log(`The new Channel (${newChannelTitle()}) was not found on the page`)
        newChannelText = null
      }
      expect(newChannelText).toBeTruthy()
    })

    it('displays a signal message', async () => {
      if (stats.active !== 2) {
        await bobboChat.call('chat', 'refresh_chatter', null)
        await wait(EXTENDED_WAITTIME)
      }

      // bobbo checks channels
      const callListChannels = async () => await bobboChat.call('chat', 'list_channels', { category: 'General' })
      const { channels } = await awaitZomeResult(callListChannels, 90000, 10000)
      console.log('channel list', channels)
      channelInFocus = channels.find(channel => channel.info.name === newChannelTitle())

      // bobbo creates new message on channel
      newMessage.channel = channelInFocus.entry
      newMessage.entry.content = 'Hello from Bob, the Tryorama player.'
      newMessage.entry.uuid = uuidv4()
      const messageResponse = await bobboChat.call('chat', 'create_message', newMessage)
      expect(messageResponse.entry).toEqual(newMessage.entry)

      // bobbo sends signal
      const signalMessageData = {
        messageData: messageResponse,
        channelData: channelInFocus
      }
      const signalResult = await bobboChat.call('chat', 'signal_chatters', signalMessageData)
      console.log('signal result', signalResult)
      expect(signalResult.sent.length).toEqual(1)

      // alice clicks on new channel with new message
      newPage = page
      const elementsWithText = await findElementByText('div', newChannelTitle(), newPage)
      const newChannelElement = elementsWithText.pop()
      await newChannelElement.click()

      // alice (node) verifies new message is in list of messages from the dht
      const callListMessages = async () => await aliceChat.call('chat', 'list_messages', { channel: channelInFocus.entry, active_chatter: true, chunk: { start: 0, end: 1 } })
      const { messages } = await awaitZomeResult(callListMessages, 90000, 10000)
      expect(messages[0].entry.content).toContain(newMessageContent())

      // alice checks for new message content on page
      newPage = page
      const newMessageElements = await findElementByText('li', newMessageContent(), newPage)
      expect(newMessageElements[0]).toBeTruthy()
      const newMessageHTML = await getElementProperty(newMessageElements[0], 'innerHTML')
      expect(newMessageHTML).toContain(newMessageContent())

      // bobbo checks stats
      newStats = await bobboChat.call('chat', 'stats', { category: 'General' })
      expect(newStats).toEqual({ ...stats, messages: stats.messages + 1 })
      stats = newStats
    })

    it('displays new messages after pressing refresh button', async () => {
      newMessage.channel = channelInFocus.entry
      newMessage.entry.uuid = uuidv4()
      newMessage.entry.content = 'Hello, there! Nice to speak with you.'

      // alice (node) creates channel - which will not display on ui but will be logged in chain
      const messageResponse = await aliceChat.call('chat', 'create_message', newMessage)
      expect(messageResponse.entry).toEqual(newMessage.entry)

      // alice (web) refreshes channel list to fetch all messages
      const refreshChannelButton = await page.$('#refresh')
      await refreshChannelButton.click()
      await wait(WAITTIME)

      // verify new message is visible on page
      const newPage = page
      const [newMessageElement2] = await findElementByText('li', newMessageContent(), newPage)
      expect(newMessageElement2).toBeTruthy()
      const newMessage2HTML = await getElementProperty(newMessageElement2, 'innerHTML')
      expect(newMessage2HTML).toContain(newMessageContent())

      // bobbo checks stats
      newStats = await bobboChat.call('chat', 'stats', { category: 'General' })
      expect(newStats).toEqual({ ...stats, messages: stats.messages + 1 })
      stats = newStats
    })
  })
})

orchestrator.run()
