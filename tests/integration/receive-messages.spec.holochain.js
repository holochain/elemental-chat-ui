import 'regenerator-runtime/runtime.js'
import wait from 'waait'
import { v4 as uuidv4 } from 'uuid'
import { orchestrator } from './setup/tryorama'
import { closeTestConductor, waitForState, awaitZomeResult, findElementByText, getElementProperty, registerNickname, beforeAllSetup } from './setup/helpers'
import { TIMEOUT } from './setup/globals'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let aliceChat, bobboChat, page, closeServer, conductor
  const callRegistry = {}
  beforeAll(async () => {
    const createPage = async () => await global.__BROWSER__.newPage();
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
    ({ aliceChat, bobboChat, page, closeServer, conductor } = await beforeAllSetup(scenario, createPage, callRegistry))
  }, TIMEOUT)

  afterAll(async () => {
    console.log('👉 Shutting down tryorama player conductor(s)...')
    await conductor.shutdown()
    console.log('✅ Closed tryorama player conductor(s)')

    console.log('👉 Closing the UI server...')
    await closeServer()
    console.log('✅ Closed the UI server...')
  })

  describe('New Channel Flow', () => {
    let channel
    const webUserNick = 'Alice'
    const newChannelTitle = 'Sending Signals Room'
    const newMessage = {
      last_seen: { First: null },
      channel: null,
      chunk: 0,
      message: {
        uuid: uuidv4(),
        content: 'Hello from Bob, the tryorama node!'
      }
    }
    const newMessageContent = newMessage.message.content

    it('displays signal message', async () => {
      let newPage = page
      await registerNickname(newPage, webUserNick)

      // *********
      // create channel
      // *********
      await page.type('#channel-name', newChannelTitle, { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))

      // wait for create call response / load
      const checkNewChannelState = () => callRegistry.createChannel
      await waitForState(checkNewChannelState, 'done')

      // bobbo (tryorama node) checks stats
      const callStats = async () => await bobboChat.call('chat', 'stats', { category: 'General' })
      const startingStats = await awaitZomeResult(callStats, 90000, 10000)
      console.log('stats after channel creation : ', startingStats)
      expect(startingStats).toEqual({ agents: 1, active: 1, channels: 1, messages: 0 })

      // bobbo creates channel
      await bobboChat.call('chat', 'refresh_chatter', null);
      const callListChannels = async () => await bobboChat.call('chat', 'list_channels', { category: 'General' })
      const { channels } = await awaitZomeResult(callListChannels, 90000, 10000)
      console.log('channel list', channels)
      channel = channels.find(channel => channel.info.name === newChannelTitle)

      // bobbo creates new message on channel
      newMessage.channel = channel.channel
      const callCreateMessage = async () => await bobboChat.call('chat', 'create_message', newMessage)
      const messageResponse = await awaitZomeResult(callCreateMessage, 90000, 10000)
      expect(messageResponse.message).toEqual(newMessage.message)
      console.log('new message', messageResponse)
      await wait(3000)

      // bobbo sends signal
      const signalMessageData = {
        messageData: messageResponse,
        channelData: channel
      }
      const callSignalChatters = async () => await bobboChat.call('chat', 'signal_chatters', signalMessageData)
      const signalResult = await awaitZomeResult(callSignalChatters, 90000, 10000)
      console.log('signal result', signalResult)
      expect(signalResult.sent.length).toEqual(1)

      await wait(3000)
      // alice (node) verifies new message is in list of messages from the dht
      const callListMessages = async () => await aliceChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: { start: 0, end: 1 }})
      const { messages } = await awaitZomeResult(callListMessages, 90000, 10000)
      expect(messages[0].message.content).toContain(newMessageContent)

      // alice (web) checks for new message content on page
      newPage = page
      const [newMessageElement] = await findElementByText('li', newMessageContent, newPage)
      expect(newMessageElement).toBeTruthy()
      const newMessageHTML = await getElementProperty(newMessageElement, 'innerHTML')
      expect(newMessageHTML).toContain(newMessageContent)

      // bobbo checks stats
      const finalStats = await bobboChat.call('chat', 'stats', { category: 'General' })
      console.log('stats after channel creation : ', finalStats)
      expect(finalStats).toEqual({ agents: 2, active: 2, channels: 1, messages: 1 })
      await wait(3000)

    })

    it('displays messages after calling listMessage', async () => {
      newMessage.message.content = 'Hello, there Bob!  This is Alice, nice to speak with you.'
      const createMessage = async () => await aliceChat.call('chat', 'create_message', newMessage)
      const messageResponse = await awaitZomeResult(createMessage, 90000, 10000)
      console.log('message 2 response', messageResponse)
      expect(messageResponse.message).toEqual(newMessage.message)

      // alice (web) refreshes channel list to check new messages (this calls list_messages)
      const refreshChannelButton = await page.$('#add-channel')
      await refreshChannelButton.click()

      await wait(2000)

      // verify new message is visible on page
      const newPage = page
      const [newMessageElement2] = await findElementByText('li', newMessageContent, newPage)
      expect(newMessageElement2).toBeTruthy()
      const newMessage2HTML = await getElementProperty(newMessageElement2, 'innerHTML')
      expect(newMessage2HTML).toContain(newMessageContent)
      await wait(3000)
    })
  })
})

orchestrator.run()
