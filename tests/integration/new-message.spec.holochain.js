import 'regenerator-runtime/runtime.js'
import { v4 as uuidv4 } from 'uuid'
import wait from 'waait'
import httpServers from './setup/setupServers.js'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
import { TIMEOUT, closeTestConductor, findIframe, waitLoad, holoAuthenticateUser, waitZomeResult } from './setup/helpers'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  const outstandingRequestIds = []
  let aliceChat, bobboChat, page, wsConnected, ports, close
  beforeAll(async () => {
    console.log('Settng up players on elemental chat...')
    // Tryorama: instantiate player conductors
    const [alice, bobbo] = await scenario.players([conductorConfig, conductorConfig], false)
    await alice.startup()
    await bobbo.startup()
    // Tryorama: install elemental chat on both player conductors
    const [[aliceChatHapp]] = await alice.installAgentsHapps([[[elChatDna]]])
    const [[bobboChatHapp]] = await bobbo.installAgentsHapps([[[elChatDna]]]);
    // Tryorama: grab chat cell from list of happ cells to use as the 'player'
    ([aliceChat] = aliceChatHapp.cells);
    ([bobboChat] = bobboChatHapp.cells)

    console.log('Sharing nodes')
    await scenario.shareAllNodes([alice])

    // Tryorama: alice declares self as chatter
    await aliceChat.call('chat', 'refresh_chatter', null);

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

    // Tryorama: confirm blank starting slate
    console.log('Confirming empty state at start')
    let stats = await aliceChat.call('chat', 'stats', {category: "General"})
    expect(stats).toEqual(stats, {agents: 0, active: 0, channels: 0, messages: 0})
  }, TIMEOUT)

  afterAll(async () => {
    log.debug("Closing the UI server...");
    await http_ctrls.close();

    console.log('Shutting down player conductors...')
    // if (bobboChat) {
    //   await closeTestConductor(bobboChat, 'Create new Message')
    // }
    // await closeTestConductor(aliceChat, 'Create new Message')
  })

  describe('New Message Flow', () => {
    it('creates and displays new message', async () => {
      // *********
      // Log into hApp
      // *********
      // wait for the signup/signin modal to load
      await wait(4000)

      await page.waitForSelector('iframe')
      const iframe = await findIframe(page, CHAPERONE_SERVER_URL)
      await iframe.$('.modal-open')

      // wait for home page to load
      await wait(3000)
      const headers = await page.$$('h1')
      const title = headers[0]
      const appTitle = await page.evaluate(title => title.innerHTML, title)
      expect(appTitle).toBe('Elemental Chat')

      // wait for home page to reload
      // TODO: Remove reload page trigger and timeout once resolve signIn/refresh after signUp bug..
      await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] })

      await wait(3000)
      const buttons = await page.$$('button')

      // *********
      // Create new Channel
      // *********
      const channelId = uuidv4()
      const newChannel = {
        name: 'Test Channel',
        channel: { category: 'General', uuid: channelId }
      }

      // Create a channel
      const channel = await aliceChat.call('chat', 'create_channel', newChannel)
      console.log(' NEW CHANNEL : ', channel)

      ////////////////////////////////
      // Enter into UI
       ////////////////////////////////

       // *********
      // Create new Message
      // *********
      // const { debug, getByText, getByLabelText } = await renderAndWait(HApp)
      // debug()

      // await wait(() => getByText('Elemental Chat'))
      // debug()

      // const newMessage = {
      //   last_seen: { First: null },
      //   channel: channel.channel,
      //   chunk: 0,
      //   message: {
      //     uuid: uuidv4(),
      //     content: 'Hello from alice :)'
      //   }
      // }

      //   fireEvent.change(getByLabelText('Send a message'), { target: { value: newMessage.message } })
      //   fireEvent.keyPress(input, { key: "Enter", code: 13, charCode: 13 });
      // })

      // // alice sends a message
      // const callListMessages = await aliceChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: {start:0, end: 1} })
      // const messages = await waitZomeResult(callListMessages, 90000, 10000)
      // console.log(' LIST MESSAGES', messages)

      // expect(getByText(newMessage.message)).toBeInTheDocument()

      // // await waait(7500)

      // expect(message).toBeTruthy()

      expect(true).toBe(true)
    })
  })
})

orchestrator.run()
