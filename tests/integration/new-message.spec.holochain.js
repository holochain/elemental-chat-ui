import 'regenerator-runtime/runtime.js'
import { v4 as uuidv4 } from 'uuid'
import wait from 'waait'
import httpServers from './setup/setupServers.js'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
import { TIMEOUT, closeTestConductor, waitLoad, waitZomeResult, findElementByText, findChildByValue, isOnPage } from './setup/helpers'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  const outstandingRequestIds = []
  let aliceChat, page, wsConnected, ports, close
  const pu = selector => findAll(`${component} ${selector}`);

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
      console.log(' ----------------> 1')
      // *********
      // register nickname
      // *********
      // verify page title
      const pageTitle = await page.title()
      expect(pageTitle).toBe('Elemental Chat')
      console.log(' ----------------> 2')

      // add agent nickname
      const webUserNick = 'Bobbo'
      await page.focus('.v-dialog')
      await page.keyboard.type(webUserNick, { delay: 100 })
      const [submitButton] = await findElementByText('button', 'Go', page)
      // console.log('submitButton : ', submitButton)
      await submitButton.click()
      console.log(' ----------------> 3')

      // add new Channel
      // const channelContainer = await page.$('.channels-container')
      // console.log('channelContainer : ', channelContainer)
      // await findChildByValue(channelContainer, page)

      // const channelValue = await channelContainer.$$eval('.channels-container', el => el.innerHTML)
      // console.log('channelValue : ', channelValue)

      const newChannelName = 'Chat Room 2'
      await page.type('#channel-name', newChannelName, { delay: 100 })
        // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))
      console.log(' ----------------> 4 ')

      // const channels = await page.$eval('.channels-container', el => el.children);
      // console.log('channels : ', channels)

      // for (let channel in channels) {
      //   console.log('channel : ', channel)

      //   // const imgSrc = await channel.$eval('div', el => el.innerHTML);
      //   // console.log('imgSrc : ', imgSrc)
      // }
      
      const [newChannel] = await findElementByText('text', newChannelName, page)
      console.log('-----------------> ', newChannel)

      // confirm that new channel name displays on page
      // expect(!!findElementByText('div', newChannelName, page)).toBeTruthy()

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
      const newMessage = {
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
        await page.keyboard.type(newMessage.message.content, { delay: 100 })
        // press 'Enter' to submit
        page.keyboard.press(String.fromCharCode(13))

        throw new Error('STOP HERE...')

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
