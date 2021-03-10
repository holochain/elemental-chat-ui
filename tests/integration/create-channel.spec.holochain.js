/* global it, describe, expect, beforeAll, afterAll */
import 'regenerator-runtime/runtime.js'
import { orchestrator } from './setup/tryorama'
import { waitForState, findElementByClassandText, getElementProperty, beforeAllSetup, registerNickname } from './setup/helpers'
import { TIMEOUT } from './setup/globals'

orchestrator.registerScenario('New Message Scenario', async scenario => {
  let page, closeServer, conductor
  const callRegistry = {}
  beforeAll(async () => {
    const createPage = async () => await global.__BROWSER__.newPage();
    // Note: passing in Puppeteer page function to instantiate pupeeteer and mock Browser Agent Actions
    ({ page, closeServer, conductor } = await beforeAllSetup(scenario, createPage, callRegistry))
  }, TIMEOUT)

  afterAll(async () => {
    console.log('👉 Shutting down tryorama player conductor(s)...')
    await conductor.shutdown()
    console.log('✅ Closed tryorama player conductor(s)')

    console.log('👉 Closing the UI server...')
    await closeServer()
    console.log('✅ Closed the UI server...')
  })

  describe('New Channel Flow', () => {
    it('creates and displays new message', async () => {
      let newPage = page
      await registerNickname(page, 'Alice')

      // *********
      // create channel
      // *********
      // alice (web user) creates a channel
      const newChannelTitle = 'Our Awesome New Room'
      await page.type('#channel-name', newChannelTitle, { delay: 100 })
      // press 'Enter' to submit
      page.keyboard.press(String.fromCharCode(13))

      // wait for create call response / load
      const checkNewChannelState = () => callRegistry.createChannel
      await waitForState(checkNewChannelState, 'done')

      // check for new channel title on page
      const channels = await page.$eval('.channels-container', el => el.children)
      expect(Object.keys(channels).length).toBe(1)
      newPage = page
      const newChannelElement = await findElementByClassandText('div', 'v-list-item', newChannelTitle, newPage)
      const newChannelHTML = await getElementProperty(newChannelElement, 'innerHTML')
      expect(newChannelElement).toBeTruthy()
      expect(newChannelHTML).toContain(newChannelTitle)
    })
  })
})

orchestrator.run()
