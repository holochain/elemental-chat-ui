import 'regenerator-runtime/runtime.js'
import { v4 as uuidv4 } from 'uuid'
import wait from 'waait'
import { orchestrator } from './setup/tryorama'
import { closeTestConductor, waitForState, awaitZomeResult, findElementByText, getElementProperty, beforeAllSetup } from './setup/helpers'
import { TIMEOUT } from './setup/globals'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let aliceChat, page, closeServer
  const callRegistry = {}
  beforeAll(async () => {
    const createPage = async() => await global.__BROWSER__.newPage();
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
    ({ aliceChat, page, closeServer } = await beforeAllSetup(scenario, createPage, callRegistry))  
  }, TIMEOUT)
  afterAll(async () => {
    console.log('👉 Shutting down tryorama player conductor(s)...')
    await closeTestConductor(aliceChat, 'Create new Message')
    console.log('✅ Closed tryorama player conductor(s)')
    
    console.log("👉 Closing the UI server...")
    await closeServer()
    console.log("✅ Closed the UI server...")
  })

  describe('New Message Flow', () => {
    it('creates and displays new message', async () => {
      // *********
      // register nickname
      // *********
      // verify page title
      const pageTitle = await page.title()
      expect(pageTitle).toBe('Elemental Chat')
      // add agent nickname
      const webUserNick = 'Bobbo'
      await page.focus('.v-dialog')
      await page.keyboard.type(webUserNick, { delay: 100 })
      const [submitButton] = await findElementByText('button', 'Let\'s Go', page)
      await submitButton.click()
  
      // *********
      // create channel (doing this at tryrama level to simulate channel created by another)
      // *********
      const channelId = uuidv4()
      const newChannel = {
          name: 'Test Channel',
          channel: { category: 'General', uuid: channelId }
        }
        // alice creates channel
        const callCreateChannel = async () => await aliceChat.call('chat', 'create_channel', newChannel)
        const channel = await awaitZomeResult(callCreateChannel, 90000, 10000)
        // alice checks stats 
        console.log('stats after channel creation : ', stats)
        let stats = await aliceChat.call('chat', 'stats', {category: "General"})
        expect(stats).toEqual({agents: 1, active: 1, channels: 1, messages: 0})
        
        // current web agent (bobbo) refreshes channel list
        const newChannelButton = await page.$('#add-channel')
        await newChannelButton.click()

        await wait(2000)

        // makes sure the channel exists first
        const channels = await page.$eval('.channels-container', el => el.children);
        expect(Object.keys(channels).length).toBe(1)
        const newChannelTitle = newChannel.name
        let newChannelText
        try {
          newChannelText = await page.waitForFunction(
            newChannelTitle => document.querySelector("body").innerText.includes(newChannelTitle),
            {},
            newChannelTitle
          );
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
          content: 'Hello from Bob, the native holochain user on the browser. :)'
        }
      }
      const newMessageContent = newMessage.message.content;

      // current web agent (bobbo) sends a message
      await page.focus('textarea')
      await page.keyboard.type(newMessageContent, { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))

      await wait(2000)

      // verify new message is in list of messages from the dht
      const callListMessages = async () => await aliceChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: {start:0, end: 1} })
      const { messages } = await awaitZomeResult(callListMessages, 90000, 10000)
      expect(messages[0].message.content).toContain(newMessageContent)

      const checkNewMessageState = () => callRegistry.addMessageToChannel
      await waitForState(checkNewMessageState, 'done')

      // alice checks stats after message
      stats = await aliceChat.call('chat', 'stats', {category: "General"})
      console.log('stats after message creation : ', stats)
      expect(stats).toEqual({agents: 1, active: 1, channels: 1, messages: 1})

      // check for new message content is on page
      const newPage = page
      const [newMessageElement] = await findElementByText('li', newMessageContent, newPage)
      expect(newMessageElement).toBeTruthy();
      const newMessageHTML = await getElementProperty(newMessageElement, 'innerHTML')
      expect(newMessageHTML).toContain(newMessageContent)
      expect(newMessageHTML).toContain(webUserNick.toUpperCase())
    })
  })
})

orchestrator.run()
