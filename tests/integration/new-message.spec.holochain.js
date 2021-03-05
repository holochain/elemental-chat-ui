import 'regenerator-runtime/runtime.js'
import { v4 as uuidv4 } from 'uuid'
import httpServers from './setup/setupServers.js'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
import { TIMEOUT, closeTestConductor, waitForState, awaitZomeResult, findElementByText, getElementProperty } from './setup/helpers'

const WEB_LOGGING = process.env.VUE_APP_WEB_LOGS === 'true'
  ? true
  : false

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let aliceChat, page, ports, closeServer
  const callRegistry = {}
  beforeAll(async () => {
    // console.log('👉 Setting up players on elemental chat...')
    // // Tryorama: instantiate player conductor
    // const [alice] = await scenario.players([conductorConfig], false)
    // await alice.startup()
    // // Tryorama: install elemental chat on both player conductors
    // const [[aliceChatHapp]] = await alice.installAgentsHapps([[[elChatDna]]]);
    // // Tryorama: grab chat cell from list of happ cells to use as the 'player'
    // ([aliceChat] = aliceChatHapp.cells);

    // console.log('ℹ️  Sharing nodes')
    // await scenario.shareAllNodes([aliceChat])

    // // Tryorama: alice declares self as chatter
    // await aliceChat.call('chat', 'refresh_chatter', null);

    // locally spin up ui server only (not holo env)
    console.log('👉 Spinning up UI server')
    ({ ports, close: closeServer } = httpServers())
    console.log('ℹ️ SERVER FN : ', closeServer)

    // Puppeteer: use pupeeteer to mock Holo Hosted Agent Actions
    page = await global.__BROWSER__.newPage()

    page.once('domcontentloaded', () => console.info('✅ DOM is ready'));
    page.once('load', () => console.info('✅ Page is loaded'));
    page.once('close', () => console.info('✅ Page is closed'))
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
    await page.setViewport({ width: 1442, height: 1341 })
    await page.goto(`http://localhost:${ports.ui}/dist/index.html`) 
    
    // console.log('Confirming empty state at start')
    // let stats = await aliceChat.call('chat', 'stats', {category: "General"})
    // console.log('1 stats : ', stats)
    // expect(stats).toEqual(stats, {agents: 0, active: 0, channels: 0, messages: 0})
  }, TIMEOUT)

  afterAll(async () => {
    console.log("👉 Closing the UI server...");
    console.log('SERVER FN : ', closeServer)
    await closeServer();
    console.log("✅ Closed the UI server...");

    // console.log('👉 Shutting down tryorama player conductor(s)...')
    // await closeTestConductor(aliceChat, 'Create new Message')
    // console.log('✅ Closed tryorama player conductor(s)')
  })

  describe('New Message Flow', () => {
    it('creates and displays new message', async () => {

      console.log(' 2 >>> SERVER FN : ', closeServer)

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

        console.log('------------------------> 1') 
     
        // alice creates channel
        const callCreateChannel = async () => await aliceChat.call('chat', 'create_channel', newChannel)
        console.log('------------------------> 2')
        const channel = await awaitZomeResult(callCreateChannel, 90000, 10000)
        console.log(' >>>>>>>>>>> NEW CHANNEL : ', channel)

        // reevaluate need
        await scenario.shareAllNodes([aliceChat]);
        console.log('------------------------> 6') 

        let stats = await aliceChat.call('chat', 'stats', {category: "General"})
        console.log('2 stats : ', stats)

        // current web agent (bobbo) clicks on created channel
        await page.focus('.channels-container')
        console.log('------------------------> 7') 
        // make sure the channel exists first
        const channels = await page.$eval('.channels-container', el => el.children);
        expect(Object.keys(channels).length).toBe(1)
        const newChannelTitle = newChannel.name
        let newChannelElement
        try {
          newChannelElement = await page.waitForFunction(
            newChannelTitle => document.querySelector("body").innerText.includes(newChannelTitle),
            {},
            newChannelTitle
          );
          console.log(`Successfully found new Channel (${newChannelTitle}) on the page`);

        } catch (e) {
          console.log(`The new Channel (${newChannelTitle}) was not found on the page`);
          newChannelElement = null
        }

        const newChannelHTML = await getElementProperty(newChannelElement, 'innerHTML')
        expect(newChannelElement).toBeTruthy()
        expect(newChannelHTML).toEqual(newChannelTitle)

        // then select that channel
        await newChannelElement.click()
 
      // *********
      // create new message
      // *********
      const newMessage = {
        // last_seen: { First: null },
        // channel: channel.channel,
        // chunk: 0,
        message: {
          uuid: uuidv4(),
          content: 'Hello from Bob, the native holochain user :)'
        }
      }
      const newMessageContent = newMessage.message.content;
      // current web agent (bobbo) sends a message
      // find channel alice made
      await page.focus('textarea')
      await page.keyboard.type(newMessageContent, { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))

      // verify new message is in list of messages from the dht
      const callListMessages = await aliceChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: {start:0, end: 1} })
      const messages = await awaitZomeResult(callListMessages, 90000, 10000)
      console.log(' LIST MESSAGES', messages)
      expect(messages[0]).toEqual(newMessage)
      // wait for create call response / load

      const checkNewMessageState = () => callRegistry.addMessageToChannel
      await waitForState(checkNewMessageState, 'done')

      // check for new message content is on page
      newPage = page
      const [newMessageElement] = await findElementByText('li', newMessageContent, newPage)
      expect(newMessageElement).toBeTruthy();
      const newMessageHTML = await getElementProperty(newMessageElement, 'innerHTML')
      expect(newMessageHTML).toContain(newMessageContent)
      expect(newMessageHTML).toContain(webUserNick.toUpperCase())
    })
  })
})

orchestrator.run()
