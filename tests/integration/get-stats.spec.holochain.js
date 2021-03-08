import 'regenerator-runtime/runtime.js'
import { orchestrator } from './setup/tryorama'
import { closeTestConductor, findElementByText, beforeAllSetup } from './setup/helpers'
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
    it.skip('creates and displays new message', async () => {
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
