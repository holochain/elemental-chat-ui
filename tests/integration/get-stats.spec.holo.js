import 'regenerator-runtime/runtime.js'
import httpServers from './setup/setupServers.js'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
import { closeTestConductor, waitForState, findElementByText, findElementByClassandText, getElementProperty } from './setup/helpers'
import { TIMEOUT, INSTALLED_APP_ID, WEB_LOGGING } from './setup/globals'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let aliceChat, page, ports, close
  const callRegistry = {}
  beforeAll(async () => {
    console.log('Settng up players on elemental chat...')
    // Tryorama: instantiate player conductor
    const [alice] = await scenario.players([conductorConfig], false)
    await alice.startup()
    // Tryorama: install elemental chat on both player conductors
    const [[aliceChatHapp]] = await alice.installAgentsHapps([[{ hAppId: INSTALLED_APP_ID, dnas: [elChatDna] }]]);
    // Tryorama: grab chat cell from list of happ cells to use as the 'player'
    ([aliceChat] = aliceChatHapp.cells)

    // Tryorama: alice declares self as chatter
    await aliceChat.call('chat', 'refresh_chatter', null)

    console.log('Confirming empty state at start')
    let stats = await aliceChat.call('chat', 'stats', {category: "General"})
    expect(stats).toEqual(stats, {agents: 0, active: 0, channels: 0, messages: 0});

    // locally spin up ui server only (not holo env)
    ({ ports, close } = httpServers())

    // Puppeteer: use pupeeteer to mock Holo Hosted Agent Actions
    page = await global.__BROWSER__.newPage()

    page.once('domcontentloaded', () => console.info('✅ DOM is ready'))
    page.once('load', () => console.info('✅ Page is loaded'))
    page.once('close', () => console.info('✅ Page is closed'))
    if (WEB_LOGGING) {
      page.on('pageerror', error => console.error(`❌ ${error}`))
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
      })
    }

    // Puppeteer: emulate avg desktop viewport
    await page.setViewport({ width: 952, height: 968 })
    await page.goto(`http://localhost:${ports.ui}/dist/index.html`) 
  }, TIMEOUT)

  afterAll(async () => {
    console.log("👉 Closing the UI server...")
    await close()
    console.log("✅ Closed the UI server...")

    console.log('👉 Shutting down tryorama player conductor(s)...')
    await closeTestConductor(aliceChat, 'Create new Message')
    console.log('✅ Closed tryorama player conductor(s)')
  })

  describe('New Channel Flow', () => {
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
        // check stats
        // *********
        //// click on get stats
    
        // *********
        // refresh chatters
        // *********
        //// refresh page
        //// click on get stats 
        ////... and compare against previous (should not be the same)

    })
  })
})

orchestrator.run()
