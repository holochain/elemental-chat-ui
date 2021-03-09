import 'regenerator-runtime/runtime.js'
import wait from 'waait'
import { v4 as uuidv4 } from 'uuid'
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
    console.log("👉 Closing the UI server...")
    await closeServer()
    console.log("✅ Closed the UI server...")

    console.log('👉 Shutting down tryorama player conductor(s)...')
    await closeTestConductor(aliceChat, 'Create new Message')
    console.log('✅ Closed tryorama player conductor(s)')
  })

  describe('New Channel Flow', () => {
    it.skip('displays signal message', async () => {
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
      // create channel
      // *********
      const newChannelTitle = 'Sending Signals Room'
      await page.type('#channel-name', newChannelTitle, { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))

      // wait for create call response / load
      const checkNewChannelState = () => callRegistry.createChannel
      await waitForState(checkNewChannelState, 'done')

      const { channels } = await aliceChat.call('chat', 'list_channels', { category: "General" })
      console.log('>>>>>>>>>>>> channel list', channels); 

      const channel = channels.find(channel => channel.info.name === newChannelTitle)

        // alice creates new message on channel
      const newMessage = {
        last_seen: { First: null },
        channel: channel.channel,
        chunk: 0,
        message: {
            uuid: uuidv4(),
            content: 'Hello from Alice, the tryorama node :)'
        }
      }
      const newMessageContent = newMessage.message.content;
      
      const messageResponse = await aliceChat.call('chat', 'create_message', newMessage);
      expect(messageResponse.message).toEqual(newMessage.message);
      console.log('>>>>>>>>>>>> message response', messageResponse); 
      await wait(3000)

      // alice sends signal
      const signalMessageData = {
        messageData: messageResponse,
        channelData: channel,
      };
      const signalResult = await aliceChat.call('chat', 'signal_chatters', signalMessageData)
      console.log('>>>>>>>>>>>> signal result', signalResult);

      await wait(2000)
      // verify new message is in list of messages from the dht
      const callListMessages = async () => await aliceChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: {start:0, end: 1} })
      const { messages } = await awaitZomeResult(callListMessages, 90000, 10000)
      expect(messages[0].message.content).toContain(newMessageContent)

      // check for new message content is on page
      newPage = page
      const [newMessageElement] = await findElementByText('li', newMessageContent, newPage)
      expect(newMessageElement).toBeTruthy();
      const newMessageHTML = await getElementProperty(newMessageElement, 'innerHTML')
      expect(newMessageHTML).toContain(newMessageContent)
      expect(newMessageHTML).toContain(webUserNick.toUpperCase())

      // alice checks stats
      let stats = await aliceChat.call('chat', 'stats', {category: "General"})
      console.log('stats signal sent : ', stats)
    })

    it.skip('displays messages after calling listMessage', async () => {
      //
    })
  })
})

orchestrator.run()
