import 'regenerator-runtime/runtime.js'
import { v4 as uuidv4 } from 'uuid'
import wait from 'waait'
import httpServers from './setup/setupServers.js'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
import { TIMEOUT, closeTestConductor, waitLoad, waitZomeResult, findElementByText } from './setup/helpers'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let aliceChat, page, ports, close
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

    page.once('domcontentloaded', () => console.info('✅ DOM is ready'));
    page.once('load', () => console.info('✅ Page is loaded'));
    page.on('console', message => console[message.type()](`ℹ️  ${message.text()}`));
    page.on('pageerror', error => console.error(`❌ ${error}`));
    page.once('close', () => console.info('✅ Page is closed'))

    // Puppeteer: emulate avg desktop viewport
    await page.setViewport({ width: 1442, height: 1341 })
    await page.goto(`http://localhost:${ports.ui}/dist/index.html`) 
    
    // console.log('Confirming empty state at start')
    // let stats = await aliceChat.call('chat', 'stats', {category: "General"})
    // expect(stats).toEqual(stats, {agents: 0, active: 0, channels: 0, messages: 0})
  }, TIMEOUT)

  afterAll(async () => {
    console.log("👉 Closing the UI server...");
    await close();
    console.log("✅ Closed the UI server...");

    // console.log('👉 Shutting down tryorama player conductor(s)...')
    // await closeTestConductor(aliceChat, 'Create new Message')
    // console.log('✅ Closed tryorama player conductor(s)')
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

      // add new Channel
      const newChannelName = 'Chat Room'
      await page.type('#channel-name', newChannelName, { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))
      
      const channels = await page.$eval('.channels-container', el => el.children);
      expect(Object.keys(channels).length).toBe(1)

      // // confirm that new channel name displays on page
      // // TODO: determine why have to reset page...
      // // let newPage = page
      // // const newChannel = await findElementByText('body', newChannelName, newPage)

      // let newChannel
      // try {
      //   newChannel = await page.waitForFunction(
      //     newChannelName => document.querySelector('body').innerText.includes(newChannelName),
      //     {},
      //     newChannelName
      //   );
      //   console.log(`Successfully found new Message (${newChannel}) on the page`);
      // } catch (e) {
      //   console.log(`The new message (${newChannel}) was not found on the page`);
      //   newChannel = null
      // }
      // console.log('-----------------> ', newChannel)
      // expect(newChannel).toBeTruthy()

      console.log(' ----------------> 5 ')
      await page.waitFor(5000)
      
      // TODO: determine why have to reset page...
      const newPage = page
      const [newChannel2] = await findElementByText('div', newChannelName, newPage)
      expect(newChannel2).toBeTruthy()
      
      const element = await page.$(".v-list-item");
      const chanText = await (
        await element.getProperty("textContent")
        ).jsonValue();
      console.log('>>>>>>>>>>>>>>>>>>>', chanText)
        
      // // const note = await page.$eval(`#notes`, el => el.value)
      // const newNote = await page.$eval((newChannel => newChannel.value), newChannel)
      // console.log('new note -----------------> ', newNote)

      // const [newChannel] = findElementByText('div', newChannelName, page)
      // // confirm that new channel name displays on page
      // expect(!!newChannel).toBeTruthy()
      // const channelValue = await page.$eval(el => el.value, newChannel)
      // console.log('CHANNEL VALUE (channel name?) :', channelValue)

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
        
        // current web agent (bobbo) clicks on created channel
        // await page.focus('.channels-container')
        // const channelList = await page.$('div#Login_form')
        // const [channelSubmitButton] = await findElementByText('button', Channel, channelList)
        // await channelSubmitButton.click()
        // console.log('page : ', page)
 
        // *********
      // create new message
      // *********
      const newMessageData = {
        // last_seen: { First: null },
        // channel: channel.channel,
        // chunk: 0,
        message: {
          uuid: uuidv4(),
          content: 'Hello from web user :)'
        }
      }
      
      // current web agent (bobbo) sends a message
        // find channel alice made
        await page.focus('textarea')
        const newMessageContent = newMessageData.message.content;
        await page.keyboard.type(newMessageContent, { delay: 100 })
        // press 'Enter' to submit
        page.keyboard.press(String.fromCharCode(13))

        console.log("Checking if channel name is displayed...");
        let newMessage
        try {
          newMessage = await page.waitForFunction(
            newMessageContent => document.querySelector("body").innerText.includes(newMessageContent),
            {},
            newMessageContent
          );
          console.log(`Successfully found new Message (${newMessage}) on the page`);

        } catch (e) {
          console.log(`The new message (${newMessageContent}) was not found on the page`);
          newMessage = null
        }
        
        expect(newMessage).toBeTruthy();

        // throw new Error('STOP HERE...')

      //   // verify new message is in list of messages
      // const callListMessages = await aliceChat.call('chat', 'list_messages', { channel: channel.channel, active_chatter: true, chunk: {start:0, end: 1} })
      // const messages = await waitZomeResult(callListMessages, 90000, 10000)
      // console.log(' LIST MESSAGES', messages)
      // expect(messages[0]).toEqual(newMessage)

      // // confirm that newMessage displays on page
      // expect(isOnPage('span', newMessage.message.content, page)).toBeTruthy()
      // // confirm the the web agent nickname displays on page
      // expect(isOnPage('span', webUserNick, page)).toBeTruthy()
    })
  })
})

orchestrator.run()
