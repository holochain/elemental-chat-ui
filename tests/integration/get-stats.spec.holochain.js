/* global it, describe, expect, beforeAll, afterAll */
import 'regenerator-runtime/runtime.js'
import { orchestrator } from './setup/tryorama'
import { findElementByText, beforeAllSetup, afterAllSetup, registerNickname } from './setup/helpers'
import { TIMEOUT } from './setup/globals'
import wait from 'waait'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let bobboChat, page, closeServer, conductor
  const callRegistry = {}
  beforeAll(async () => {
    const createPage = async () => await global.__BROWSER__.newPage();
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
    ({ bobboChat, page, closeServer, conductor } = await beforeAllSetup(scenario, createPage, callRegistry))
  }, TIMEOUT)
  afterAll(async () => {
    await afterAllSetup(conductor, closeServer)
  })

  describe('Stats Display Flow', () => {
    const checkStats = async (statArray, element) => {
      const stats = statArray
      for (const e in element) {
        try {
          const text = await (await element[e].getProperty('textContent')).jsonValue()
          stats.push(text)
        } catch(e) {
          console.log('error: ', e)
          continue
        }
      }
      return stats
    }

    it('displays correct stats before and after new chatter', async () => {
      const newPage = page
      await registerNickname(newPage, 'Alice')
      await wait(3000)

      // *********
      // check stats
      // *********
      // alice (web) clicks on get-stats
      await page.click('#get-stats')
      await wait(3000)
      let element = await page.$$('.display-1')
      let texts = await checkStats([], element)
      console.log('Stats prior to second agent: ', texts)

      // assert that we find the right stats
      expect(texts[1]).toContain('1')
      expect(texts[3]).toContain('1')
      expect(texts[5]).toContain('0')
      expect(texts[7]).toContain('0')

      const [closeButton] = await findElementByText('button', 'Close', page)
      await closeButton.click()

      // bobbo (tryorama node) declares self as chatter
      await bobboChat.call('chat', 'refresh_chatter', null)

      await wait(3000)

      // *********
      // refresh chatters by second agent
      // *********
      await page.click('#get-stats')
      await wait(3000)
      // reset element to evaluate
      element = await page.$$('.display-1')
      texts = await checkStats([], element)      
      console.log('Stats after second agent: ', texts)

      // assert that we find the right stats
      expect(texts[1]).toContain('2')
      expect(texts[3]).toContain('2')
      expect(texts[5]).toContain('0')
      expect(texts[7]).toContain('0')
    })
  })
})

orchestrator.run()
