import { TIMEOUT, HOSTED_AGENT, CHAPERONE_URL_REGEX, CHAPERONE_URL_REGEX_DEV, WEB_LOGGING } from './setup/globals'
import { findIframe, holoAuthenticateUser, getElementProperty, findElementByText } from './setup/helpers'
import httpServers from './setup/setupServers'
import wait from 'waait'

const chaperoneUrlCheck = {
  production: CHAPERONE_URL_REGEX,
  develop: CHAPERONE_URL_REGEX_DEV
}

describe('Authentication Flow', () => {
  let page, mainFrame, closeServer
  beforeAll(async () => {
    console.log('👉 Spinning up UI server')
    const { ports, close } = httpServers()
    closeServer = close
    page = await global.__BROWSER__.newPage()
    mainFrame = page.mainFrame()

    page.once('domcontentloaded', () => console.info('✅ DOM is ready'))
    page.once('load', () => console.info('✅ Page is loaded'))
    page.once('close', () => console.info('✅ Page is closed'))
    if (WEB_LOGGING) {
      page.on('pageerror', error => console.error(`❌ ${error}`))
      page.on('console', message => {
        try {
          console[message.type()](`ℹ️ ${message.text()}`)
        } catch (error) {
          console.info(`ℹ️ ${message}`)
        }
      })
    }

    // Puppeteer: emulate avg desktop viewport
    await page.setViewport({ width: 952, height: 968 })
    await page.goto(`http://localhost:${ports.ui}/dist/index.html`)
  }, TIMEOUT)

  afterAll(async () => {
    console.log('👉 Closing the UI server...')
    await closeServer()
    console.log('✅ Closed the UI server...')
  })

  it('should successfully sign up', async () => {
    // *********
    // Sign Up and Log Into hApp
    // *********
    // wait for the modal to load
    await page.waitForSelector('iframe')

    console.log('------------> 1')

    const iframe = await findIframe(page, chaperoneUrlCheck.production)

    console.log('------------> 2')

    const chaperoneModal = await iframe.evaluateHandle(() => document)
    console.log('------------> 3')

    const modalTitle = 'Elemental Chat Login'
    const modal = await page.waitForFunction(
      (modalTitle, chaperoneModal) => document.querySelector(chaperoneModal).innerText.includes(modalTitle),
      {},
      modalTitle,
      chaperoneModal
    )
    expect(modal).toContain('Elemental Chat Login')

    const createCredentialsLink = await findElementByText('a', 'Create credentials', chaperoneModal)
    console.log('------------> 4')
    await createCredentialsLink.click()

    const { emailInput, passwordInput, confirmationInput } = await holoAuthenticateUser(chaperoneModal, HOSTED_AGENT.email, HOSTED_AGENT.password, 'signup')

    const email = await getElementProperty(emailInput, 'value')
    const password = await getElementProperty(passwordInput, 'value')
    const confirmation = await getElementProperty(confirmationInput, 'value')

    expect(email).toBe(HOSTED_AGENT.email)
    expect(password).toBe(HOSTED_AGENT.password)
    expect(confirmation).toEqual(password)

    // *********
    // Evaluate Home Page
    // *********
    await wait(2000)

    // verify page title
    const pageTitle = await page.title()
    expect(pageTitle).toBe('Elemental Chat')
  })
}, TIMEOUT)
