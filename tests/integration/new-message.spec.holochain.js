import 'regenerator-runtime/runtime.js'
import { v4 as uuidv4 } from 'uuid'
import wait from 'waait'
import httpServers from './setup/setupServers.js'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
import { TIMEOUT, closeTestConductor, findIframe, waitLoad, waitZomeResult, findElementByText, isOnPage } from './setup/helpers'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  const outstandingRequestIds = []
  let aliceChat, page, wsConnected, ports, close
  beforeAll(async () => {
    // console.log('Settng up players on elemental chat...')
    // // Tryorama: instantiate player conductor
    // const [alice] = await scenario.players([conductorConfig], false)
    // await alice.startup()
    // // Tryorama: install elemental chat on both player conductors
    // const [[aliceChatHapp]] = await alice.installAgentsHapps([[[elChatDna]]]);
    // // Tryorama: grab chat cell from list of happ cells to use as the 'player'
    // ([aliceChat] = aliceChatHapp.cells);

    // console.log('Sharing nodes')
    // await scenario.shareAllNodes([alice])

    // // Tryorama: alice declares self as chatter
    // await aliceChat.call('chat', 'refresh_chatter', null);

    // locally spin up ui server only (not holo env)
    ({ ports, close } = httpServers())

    // Puppeteer: use pupeeteer to mock Holo Hosted Agent Actions
    console.log(global.__BROWSER__);
    page = await global.__BROWSER__.newPage()

    // Puppeteer: emulate avg desktop viewport
    await page.setViewport({ width: 1442, height: 1341 })
    await page.goto(`http://localhost:${ports.ui}/dist/index.html`)

    // Puppeteer: setup logs
    const client = page._client
    client.on('Network.webSocketFrameSent', ({ response }) => {
      wsConnected = !!response
      const callId = JSON.parse(response.payloadData).id
      outstandingRequestIds.push(callId)
    })
    client.on('Network.webSocketFrameReceived', ({ response }) => {
      const callId = JSON.parse(response.payloadData).id
      _.remove(outstandingRequestIds, id => id === callId)
    })

    // // Tryorama: confirm blank starting slate
    // console.log('Confirming empty state at start')
    // let stats = await aliceChat.call('chat', 'stats', {category: "General"})
    // expect(stats).toEqual(stats, {agents: 0, active: 0, channels: 0, messages: 0})
  }, TIMEOUT)

  afterAll(async () => {
    console.log("Closing the UI server...");
    await close();

    console.log('Shutting down tryorama player conductor(s)...')
    // await closeTestConductor(aliceChat, 'Create new Message')
  })

  describe('New Message Flow', () => {
    it('creates and displays new message', async () => {
      // *********
      // register nickname
      // *********
      // wait for home page to load
      await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] })

      await waitLoad(() => wsConnected)
      
      // verify page title
      await wait(3000)
      const headers = await page.$$('h1')
      const title = headers[0]
      const appTitle = await page.evaluate(title => title.innerHTML, title)
      expect(appTitle).toBe('Elemental Chat')

      // add agent nickname
      await wait(3000)
      const webUserNick = 'Bobbo'
      const addNickInput = await page.waitForSelector('.v-input #input-22')
      await page.click(addNickInput)
      await page.type(addNickInput, webUserNick, { delay: 10 })
      // press 'Enter' to submit
      await page.type(String.fromCharCode(13))

      // *********
      // create channel (doing this at tryrama level to simulate channel created by another)
      // *********
      // const channelId = uuidv4()
      // const newChannel = {
      //   name: 'Test Channel',
      //   channel: { category: 'General', uuid: channelId }
      // }

      // alice creates channel
      // const callCreateChannel = await aliceChat.call('chat', 'create_channel', newChannel)
      // const channel = await waitZomeResult(callCreateChannel, 90000, 10000)
      // console.log(' NEW CHANNEL : ', channel)

      // *********
      // create new message
      // *********
      const newMessage = {
        last_seen: { First: null },
        channel: channel.channel,
        chunk: 0,
        message: {
          uuid: uuidv4(),
          content: 'Hello from web user :)'
        }
      }
      
      // current web agent (bobbo) sends a message

        // find channel alice made
        const chatChannel = findElementByText('div', newChannel.name, page) // update to reference the returned channel
        await page.click(chatChannel)

        const newMessageInput = await page.waitForSelector('.v-text-field__slot > textarea')
        await page.click(newMessageInput)
        await page.type(newMessageInput, newMessage.message.content, { delay: 10 })
        // press 'Enter' to submit
        await page.type(String.fromCharCode(13))

      // verify new message is in list of messages
      const callListMessages = await aliceChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: {start:0, end: 1} })
      const messages = await waitZomeResult(callListMessages, 90000, 10000)
      console.log(' LIST MESSAGES', messages)
      expect(messages[0]).toEqual(newMessage)

      // confirm that newMessage displays on page
      expect(isOnPage('span', newMessage.message.content, page)).toBeTruthy()
      // confirm the the web agent nickname displays on page
      expect(isOnPage('span', webUserNick, page)).toBeTruthy()
    })
  })
})

orchestrator.run()
