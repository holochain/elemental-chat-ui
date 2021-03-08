import 'regenerator-runtime/runtime.js'
import { v4 as uuidv4 } from 'uuid'
import wait from 'waait'
import httpServers from './setup/setupServers.js'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
import { TIMEOUT, closeTestConductor, waitForState, awaitZomeResult, findElementByText, findElementByClassandText, getElementProperty } from './setup/helpers'

const WEB_LOGGING = process.env.VUE_APP_WEB_LOGS === 'true'
  ? true
  : false

const INSTALLED_APP_ID = 'elemental-chat:alpha19:0001'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let aliceChat, page, ports, closeServer
  const callRegistry = {}
  beforeAll(async () => {
    console.log('👉 Setting up players on elemental chat...')
    // Tryorama: instantiate player conductor
    const [alice] = await scenario.players([conductorConfig], false)
    await alice.startup()
    // Tryorama: install elemental chat on both player conductors
    const [[aliceChatHapp]] = await alice.installAgentsHapps([[{ hAppId: INSTALLED_APP_ID, dnas: [elChatDna] }]]);
    // Tryorama: grab chat cell from list of happ cells to use as the 'player'
    ([aliceChat] = aliceChatHapp.cells);

    // Tryorama: alice declares self as chatter
    await aliceChat.call('chat', 'refresh_chatter', null);

    console.log('Confirming empty state at start')
    let stats = await aliceChat.call('chat', 'stats', {category: "General"})
    console.log('1 stats : ', stats)
    expect(stats).toEqual(stats, {agents: 0, active: 0, channels: 0, messages: 0})

    // locally spin up ui server only (not holo env)
    console.log('👉 Spinning up UI server');
    ({ ports, close: closeServer } = httpServers());

    // Puppeteer: use pupeeteer to mock Holo Hosted Agent Actions
    page = await global.__BROWSER__.newPage()

    page.once('domcontentloaded', () => console.info('✅ DOM is ready'));
    page.once('load', () => console.info('✅ Page is loaded'));
    page.once('close', () => console.info('✅ Page is closed'));
    if (WEB_LOGGING) {
      page.on('pageerror', error => console.error(`❌ ${error}`));
      page.on('console', message => {
        const consoleMessage = message.text();
        console[message.type()](`ℹ️  ${consoleMessage}`)
        const messageArray = consoleMessage.split(' ')
        try {
          // determine if message is a registered api call
          if (parseInt(messageArray[0])) {
            messageArray.shift()
            const callDesc = messageArray.join(' ')
            const callAction = messageArray.pop()
            const isCallAction = callAction === 'start' || callAction === 'done'
            if (isCallAction) {
              if (messageArray.length > 1 && !callDesc.includes('zome')) return
              const callName = messageArray[0]
              // set the call with most current action state
              callRegistry[callName] = callAction
            }
          }
        } catch (error) {
          // if error, do nothing - message is not a logged call
          return
        }
      });
    }

    // Puppeteer: emulate avg desktop viewport
    await page.setViewport({ width: 952, height: 968 })
    await page.goto(`http://localhost:${ports.ui}/dist/index.html`) 
    
  })

  afterAll(async () => {
    console.log("👉 Closing the UI server...");
    await closeServer();
    console.log("✅ Closed the UI server...");

    console.log('👉 Shutting down tryorama player conductor(s)...')
    await closeTestConductor(aliceChat, 'Create new Message')
    console.log('✅ Closed tryorama player conductor(s)')
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
        let stats = await aliceChat.call('chat', 'stats', {category: "General"})
        console.log('stats after first channel creation : ', stats)
        
        // current web agent (bobbo) refreshes channel list
        const newChannelButton = await page.$('#add-channel')
        await newChannelButton.click()

        await wait(5000)

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
        // console.log('------------------------> 5')
        // let newPage = page
        // const newChannelElement = await findElementByClassandText('div', 'v-list-item', newChannelTitle, newPage)
        // console.log('NEW CHANNEL ELEMENT : ', newChannelElement)
        // const newChannelHTML = await getElementProperty(newChannelElement,'innerHTML')
        // console.log('------------------------> 6')
        // expect(newChannelHTML).toEqual(newChannelTitle)
 
      // *********
      // create new message
      // *********
      const newMessage = {
        last_seen: { First: null },
        channel: channel.channel,
        chunk: 0,
        message: {
          uuid: uuidv4(),
          content: 'Hello from Bob, the native holochain user :)'
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
