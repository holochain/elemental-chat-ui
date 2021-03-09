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
    const createPage = async () => await global.__BROWSER__.newPage();
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
    ({ aliceChat, page, closeServer } = await beforeAllSetup(scenario, createPage, callRegistry))
  }, TIMEOUT)

  afterAll(async () => {
    console.log('👉 Closing the UI server...')
    await closeServer()
    console.log('✅ Closed the UI server...')

    console.log('👉 Shutting down tryorama player conductor(s)...')
    await closeTestConductor(aliceChat, 'Create new Message')
    console.log('✅ Closed tryorama player conductor(s)')
  })

  describe('New Channel Flow', () => {
    let channel
    const webUserNick = 'Bobbo'

    const newMessage = {
      last_seen: { First: null },
      channel: channel.channel,
      chunk: 0,
      message: {
        uuid: uuidv4(),
        content: 'Hello from Alice, the tryorama node :)'
      }
    }
    const newMessageContent = newMessage.message.content

    it.skip('displays signal message', async () => {
      // *********
      // register nickname
      // *********
      // verify page title
      const pageTitle = await page.title()
      expect(pageTitle).toBe('Elemental Chat')
      // add agent nickname
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

      // Tryorama: alice declares self as chatter
      await aliceChat.call('chat', 'refresh_chatter', null)
      // alice checks stats
      const startingStats = await aliceChat.call('chat', 'stats', { category: 'General' })
      console.log('stats after channel creation : ', startingStats)

      // alice creates channel
      const callListChannels = async () => await aliceChat.call('chat', 'list_channels', { category: 'General' })
      const { channels } = await awaitZomeResult(callListChannels, 90000, 10000)
      console.log('>>>>>>>>>>>> channel list', channels)
      channel = channels.find(channel => channel.info.name === newChannelTitle)

      // alice creates (tryorama) new message on channel
      const messageResponse = await aliceChat.call('chat', 'create_message', newMessage)
      expect(messageResponse.message).toEqual(newMessage.message)
      console.log('>>>>>>>>>>>> message response', messageResponse)
      await wait(3000)

      // alice sends signal
      const signalMessageData = {
        messageData: messageResponse,
        channelData: channel
      }
      const signalResult = await aliceChat.call('chat', 'signal_chatters', signalMessageData)
      console.log('>>>>>>>>>>>> signal result', signalResult)
      // expect(signalResult.sent.total).toEqual(1)
      // expect(signalResult.sent.length).toEqual(1)

      await wait(3000)
      // verify new message is in list of messages from the dht
      const callListMessages = async () => await aliceChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: { start: 0, end: 1 }})
      const { messages } = await awaitZomeResult(callListMessages, 90000, 10000)
      expect(messages[0].message.content).toContain(newMessageContent)

      console.log('>>>>>>> message 1. > about to search page')
      // check for new message content is on page
      const newPage = page
      const [newMessageElement] = await findElementByText('li', newMessageContent, newPage)
      expect(newMessageElement).toBeTruthy()
      const newMessageHTML = await getElementProperty(newMessageElement, 'innerHTML')
      expect(newMessageHTML).toContain(newMessageContent)
      expect(newMessageHTML).toContain(webUserNick.toUpperCase())

      // alice checks stats
      const newStats = await aliceChat.call('chat', 'stats', { category: 'General' })
      console.log('stats signal sent : ', newStats)
    })

    it.skip('displays messages after calling listMessage', async () => {
      // alice creates (tryorama) new message on channel
      newMessage.message.content = 'Message #2'
      const createMessage = async () => await aliceChat.call('chat', 'create_message', newMessage)
      const messageResponse = await awaitZomeResult(createMessage, 90000, 10000)
      console.log('>>>>>>>>>>>> message response', messageResponse)
      expect(messageResponse.message).toEqual(newMessage.message)

      // current web agent (bobbo) refreshes channel list to check new messages (this calls list_messages)
      const refreshChannelButton = await page.$('#add-channel')
      await refreshChannelButton.click()

      await wait(2000)

      // verify new message is visible on page
      console.log('>>>>>>> message 2. >> about to search page')
      const newPage = page
      const [_, newMessageElement2] = await findElementByText('li', newMessageContent, newPage)
      expect(newMessageElement2).toBeTruthy()
      const newMessage2HTML = await getElementProperty(newMessageElement2, 'innerHTML')
      expect(newMessage2HTML).toContain(newMessageContent)
      expect(newMessage2HTML).toContain(webUserNick.toUpperCase())
      await wait(3000)
    })
  })
})

orchestrator.run()
