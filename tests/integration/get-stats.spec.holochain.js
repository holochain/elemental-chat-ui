import 'regenerator-runtime/runtime.js'
import { orchestrator } from './setup/tryorama'
import { closeTestConductor, findElementByText, beforeAllSetup } from './setup/helpers'
import { TIMEOUT } from './setup/globals'
import wait from 'waait'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let aliceChat, bobboChat, page, closeServer
  const callRegistry = {}
  beforeAll(async () => {
    const createPage = async () => await global.__BROWSER__.newPage();
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
    ({ aliceChat, bobboChat, page, closeServer } = await beforeAllSetup(scenario, createPage, callRegistry))
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
    it('creates and displays new message', async () => {
      // *********
      // register nickname
      // *********
      // verify page title
      const pageTitle = await page.title()
      expect(pageTitle).toBe('Elemental Chat')
      // add agent nickname
      const webUserNick = 'Bob'
      await page.focus('.v-dialog')
      await page.keyboard.type(webUserNick, { delay: 100 })
      const [submitButton] = await findElementByText('button', 'Let\'s Go', page)
      await submitButton.click()

      // *********
      // check stats
      // *********
      //// click on get stats // get-stats
      await page.click('#get-stats')
      await wait(5000)
      let element = await page.$$('.display-1')
      let texts = []
      for (const e in element) {
        try {
          const text = await (await element[e].getProperty('textContent')).jsonValue();
          texts.push(text)
        }catch(e) {
          console.log('error: ', e)
          continue
        }
      }

      console.log('All the text: ', texts)

      // assert that we find the right stats
      expect(texts[1]).toContain('1')
      expect(texts[3]).toContain('1')
      expect(texts[5]).toContain('0')
      expect(texts[7]).toContain('0')

      const [closeButton] = await findElementByText('button', 'Close', page)
      await closeButton.click()
      // Tryorama: alice declares self as chatter
      await bobboChat.call('chat', 'refresh_chatter', null)
      await wait(5000)

      // *********
      // refresh chatters by second agent
      // *********
      //// refresh page
      //// click on get stats
      ////... and compare against previous (should not be the same)
      await page.click('#get-stats')
      await wait(5000)
      element = await page.$$('.display-1')
      texts = []
      for (const e in element) {
        try {
          const text = await (await element[e].getProperty('textContent')).jsonValue()
          texts.push(text)
        }catch(e) {
          console.log('error: ', e)
          continue
        }
      }

      console.log('All the text: ', texts)

      // assert that we find the right stats
      expect(texts[1]).toContain('2')
      expect(texts[3]).toContain('2')
      expect(texts[5]).toContain('0')
      expect(texts[7]).toContain('0')
    })
  })
})

orchestrator.run()
