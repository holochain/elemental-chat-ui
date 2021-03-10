import 'regenerator-runtime/runtime.js'
import { v4 as uuidv4 } from 'uuid'
import wait from 'waait'
import { orchestrator } from './setup/tryorama'
import { closeTestConductor, waitForState, awaitZomeResult, findElementByText, getElementProperty, beforeAllSetup, registerNickname } from './setup/helpers'
import { TIMEOUT } from './setup/globals'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let bobboChat, page, closeServer, conductor
  const callRegistry = {}
  beforeAll(async () => {
    const createPage = async () => await global.__BROWSER__.newPage();
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
    ({ bobboChat, page, closeServer, conductor } = await beforeAllSetup(scenario, createPage, callRegistry))
  }, TIMEOUT)
  afterAll(async () => {
    console.log('👉 Shutting down tryorama player conductor(s)...')
    await conductor.shutdown()
    console.log('✅ Closed tryorama player conductor(s)')

    console.log('👉 Closing the UI server...')
    await closeServer()
    console.log('✅ Closed the UI server...')
  })

  describe('New Message Flow', () => {
    it('creates and displays new message', async () => {
      const webUserNick = 'Alice'
      let newPage = page
      await registerNickname(page, webUserNick)

      // *********
      // create channel (doing this at tryrama level to simulate channel created by another)
      // *********
      const channelId = uuidv4()
      const newChannel = {
        name: 'Test Channel',
        channel: { category: 'General', uuid: channelId }
      }
      // bobbo (tryorama node) creates channel
      await bobboChat.call('chat', 'refresh_chatter', null)
      const callCreateChannel = async () => await bobboChat.call('chat', 'create_channel', newChannel)
      const channel = await awaitZomeResult(callCreateChannel, 90000, 10000)
      // bobbo checks stats
      let stats = await bobboChat.call('chat', 'stats', { category: 'General' })
      console.log('stats after channel creation : ', stats)
      expect(stats).toEqual({ agents: 2, active: 2, channels: 1, messages: 0 })

      // alice (web) refreshes channel list
      const newChannelButton = await page.$('#add-channel')
      await newChannelButton.click()

      await wait(2000)

      // alice makes sure the channel exists first
      const channels = await page.$eval('.channels-container', el => el.children)
      expect(Object.keys(channels).length).toBe(1)
      const newChannelTitle = newChannel.name
      let newChannelText
      try {
        newChannelText = await page.waitForFunction(
          newChannelTitle => document.querySelector('body').innerText.includes(newChannelTitle),
          {},
          newChannelTitle
        )
        console.log(`Successfully found new Channel (${newChannelTitle}) on the page`);
      } catch (e) {
        console.log(`The new Channel (${newChannelTitle}) was not found on the page`);
        newChannelText = null
      }
      expect(newChannelText).toBeTruthy()

      // *********
      // create new message
      // *********
      const newMessage = {
        last_seen: { First: null },
        channel: channel.channel,
        chunk: 0,
        message: {
          uuid: uuidv4(),
          content: 'Hello from Alice, the native holochain user on the web. :)'
        }
      }
      const newMessageContent = newMessage.message.content;

      // alice (web) sends a message
      await page.focus('textarea')
      await page.keyboard.type(newMessageContent, { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))

      await wait(2000)

      // bobbo (tryorama node) verifies new message is in list of messages from the dht
      const callListMessages = async () => await bobboChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: { start: 0, end: 1 } })
      const { messages } = await awaitZomeResult(callListMessages, 90000, 10000)
      expect(messages[0].message.content).toContain(newMessageContent)

      const checkNewMessageState = () => callRegistry.addMessageToChannel
      await waitForState(checkNewMessageState, 'done')

      // check for new message content is on page
      newPage = page
      const [newMessageElement] = await findElementByText('li', newMessageContent, newPage)
      expect(newMessageElement).toBeTruthy();
      const newMessageHTML = await getElementProperty(newMessageElement, 'innerHTML')
      expect(newMessageHTML).toContain(newMessageContent)
      expect(newMessageHTML).toContain(webUserNick.toUpperCase())

      // bobbo checks stats after message
      stats = await bobboChat.call('chat', 'stats', { category: 'General' })
      console.log('final stats : ', stats)
      expect(stats).toEqual({ agents: 2, active: 2, channels: 1, messages: 1 })
    })
  })
})

orchestrator.run()
