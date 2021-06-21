/* global it, describe, expect, beforeAll, afterAll */
import wait from 'waait'
import { TIMEOUT, HOSTED_AGENT, CHAPERONE_URL_REGEX, CHAPERONE_URL_REGEX_DEV, CHAPERONE_URL_REGEX_HCC, WEB_LOGGING } from './setup/globals'
import { findIframe, holoAuthenticateUser, findElementsByText } from './setup/helpers'
import httpServers from './setup/setupServers'

const chaperoneUrlCheck = {
  production: CHAPERONE_URL_REGEX,
  local: CHAPERONE_URL_REGEX_HCC
}

describe('Authentication Flow', () => {
  let page, closeServer
  beforeAll(async () => {
    console.log('👉 Spinning up UI server')
    const { ports, close } = httpServers()
    closeServer = close
    page = await global.__BROWSER__.newPage()

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
    // verify page
    const pageTitle = await page.title()
    expect(pageTitle).toBe('Elemental Chat')

    // Wait for Connection to Host overlay to disappear
    await wait(500)
    const [loginButton] = await findElementsByText('span', 'Login', page)
    await loginButton.click()

    // *********
    // Sign Up and Log Into hApp
    // *********
    // wait for the modal to load
    await page.waitForSelector('iframe')
    const iframe = await findIframe(page, chaperoneUrlCheck.local)
    const chaperoneModal = await iframe.evaluateHandle(() => document)

    const [loginTitle] = await findElementsByText('h1', 'Elemental Chat Login', chaperoneModal)
    expect(loginTitle).toBeTruthy()

    const [createCredentialsLink] = await findElementsByText('a', 'Create credentials', chaperoneModal)
    await createCredentialsLink.click()

    const { emailValue, passwordValue, confirmationValue } = await holoAuthenticateUser(iframe, chaperoneModal, HOSTED_AGENT.email, HOSTED_AGENT.password, 'signup')

    expect(emailValue).toBe(HOSTED_AGENT.email)
    expect(passwordValue).toBe(HOSTED_AGENT.password)
    expect(confirmationValue).toEqual(passwordValue)


    await wait(5000)
    // *********
    // Evaluate Main Frame
    // *********
    // verify main page has logout button
    const [logoutButton] = await findElementsByText('span', 'Logout', page)
    expect(logoutButton).toBeTruthy()
  })
}, TIMEOUT)
