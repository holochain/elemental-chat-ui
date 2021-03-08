import { TIMEOUT, HOSTED_AGENT } from './setup/globals'
import { findIframe, holoAuthenticateUser, takeSnapshot } from './setup/helpers'
import wait from 'waait'

const CHAPERONE_SERVER_URL = process.env.VUE_APP_CHAPERONE_SERVER_URL

// TODO: This test is on hold.
describe('Authentication Flow', () => {
  let page
  beforeAll(async () => {
    page = await global.__BROWSER__.newPage()

    // Puppeteer: emulate avg desktop viewport
    await page.setViewport({ width: 1442, height: 1341 })
    await page.goto(`http://localhost:${ports.ui}/dist/index.html`) 
  }, TIMEOUT)

  it.skip('should locate the loading text', async () => {
    const pageContent = await page.$eval('#root', el => el.innerHTML)
    await takeSnapshot(page, 'loadingPage')
    expect(pageContent).toContain('Connecting to the Holo network')
  })

  it.skip('should successfully sign up and sign out', async () => {
    // *********
    // Sign Up and Log Into hApp
    // *********
    // wait for the modal to load
    await wait(5000)
    await page.waitForSelector('iframe')

    const iframe = await findIframe(page, CHAPERONE_SERVER_URL)
    const modalData = await iframe.$eval('.modal-open', el => el.innerHTML)
    expect(modalData).toContain('Login with Holo')
    expect(modalData).toContain('Sign Up')

    const { email, password, confirmation } = await holoAuthenticateUser(page, iframe, HOSTED_AGENT.email, HOSTED_AGENT.password, 'signup')

    expect(email).toBe(HOSTED_AGENT.email)
    expect(password).toBe(HOSTED_AGENT.password)
    expect(confirmation).toEqual(password)

    await takeSnapshot(page, 'afterSignupScreen')

    // // *********
    // // Evaluate Home Page
    // // *********
    // await wait(5000)

    // // verify page title
    // const pageTitle = await page.title()
    // expect(pageTitle).toBe('Elemental Chat')

    // // *********
    // // Sign Out
    // // *********
    // const button = await page.$$('button')
    // const SignOutButton = button[1]
    // SignOutButton.click()

    // await wait(1000)
    // await takeSnapshot(page, 'afterSignoutModal')

    // const newIframe = await findIframe(page, CHAPERONE_SERVER_URL)
    // const newModalData = await newIframe.$eval('.modal-open', el => el.innerHTML)
    // expect(newModalData).toContain('Login with Holo')
  })
}, TIMEOUT)

