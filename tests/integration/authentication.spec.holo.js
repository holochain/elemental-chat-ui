import { TIMEOUT, HOSTED_AGENT } from './setup/globals'
import { findIframe, holoAuthenticateUser, takeSnapshot } from './setup/helpers'
import wait from 'waait'

const CHAPERONE_URL_REGEX = /^https?:\/\/chaperone\w*\.holo\.host/

describe('Authentication Flow', () => {
  let page
  beforeAll(async () => {
    page = await global.__BROWSER__.newPage()

    // Puppeteer: emulate avg desktop viewport
    await page.setViewport({ width: 1442, height: 1341 })
    await page.goto(`http://localhost:${ports.ui}/dist/index.html`) 
  }, TIMEOUT)

  it.skip('should successfully sign up', async () => {
    // *********
    // Sign Up and Log Into hApp
    // *********
    // wait for the modal to load
    await wait(5000)
    await page.waitForSelector('iframe')

    const iframe = await findIframe(page, CHAPERONE_URL_REGEX)

    const chaperoneData = await iframe.$eval('.modal-open', el => el.innerHTML)
    expect(chaperoneData).toContain('Elemental Chat Login')

    const { email, password, confirmation } = await holoAuthenticateUser(chaperoneData, HOSTED_AGENT.email, HOSTED_AGENT.password, 'signup')

    expect(email).toBe(HOSTED_AGENT.email)
    expect(password).toBe(HOSTED_AGENT.password)
    expect(confirmation).toEqual(password)

    await takeSnapshot(page, 'afterSignupScreen')

    // *********
    // Evaluate Home Page
    // *********
    await wait(2000)

    // verify page title
    const pageTitle = await page.title()
    expect(pageTitle).toBe('Elemental Chat')
  })
}, TIMEOUT)

