/* global it, describe, expect, beforeAll, afterAll */
import wait from 'waait'
import { TIMEOUT, HOSTED_AGENT, CHAPERONE_URL_REGEX, CHAPERONE_URL_REGEX_DEV, CHAPERONE_URL_REGEX_HCC, WEB_LOGGING } from './setup/globals'
import { findIframe, holoAuthenticateUser, findElementsByText, getStats, registerNickname, setupPage } from './setup/helpers'
import httpServers from './setup/setupServers'

const chaperoneUrlCheck = {
  production: CHAPERONE_URL_REGEX,
  local: CHAPERONE_URL_REGEX_HCC
}

describe('Authentication Flow', () => {
  let page, closeServer, serverPorts, callRegistry
  beforeAll(async () => {
    console.log('👉 Spinning up UI server')
    const { ports, close } = httpServers()
    serverPorts = ports
    closeServer = close
  }, TIMEOUT)

  beforeEach(async () => {
    callRegistry = {}
    page = await global.__BROWSER__.newPage()
    await setupPage(page, callRegistry, `http://localhost:${serverPorts.ui}/dist/index.html`, { waitForNavigation: true })
  }, TIMEOUT)

  afterEach(async () => {
    await page.close()
  })

  afterAll(async () => {
    console.log('👉 Closing the UI server...')
    await closeServer()
    console.log('✅ Closed the UI server...')
  })

  it('can make anonymous zome calls', async () => {
    await wait(500)
    const stats = await getStats(page)
    expect(stats).toEqual({
      agents: '0',
      active: '0',
      channels: '0',
      messages: '0'
    })
  })

  it('can sign up, make zome call, log out, and sign back in', async () => {
    // verify page
    const pageTitle = await page.title()
    expect(pageTitle).toBe('Elemental Chat')

    // Wait for "Connecting to HoloPort..." overlay to disappear
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

    // Wait for signup to complete
    await wait(1500)

    // Select nickname textbox
    const [dialog] = await page.$$('.v-dialog')
    const elementsWithText = await findElementsByText('div', 'Enter your handle', dialog)
    const updateHandleInput = elementsWithText.pop()
    await updateHandleInput.click()

    // Test zome calls by registering a nickname and confirming that it remains
    await registerNickname(page, 'AliceHosted')
    const [nickname] = await findElementsByText('div', 'AliceHosted', page)
    expect(nickname).toBeTruthy()
    
    const [logoutButton] = await findElementsByText('span', 'Logout', page)
    await logoutButton.click()

    await wait(500)
    const [loginButton2] = await findElementsByText('span', 'Login', page)
    await loginButton2.click()

    await holoAuthenticateUser(iframe, chaperoneModal, HOSTED_AGENT.email, HOSTED_AGENT.password, 'signin')
    await wait(1500)

    const [nickname2] = await findElementsByText('div', 'AliceHosted', page)
    expect(nickname2).toBeTruthy()
  })

  it('makes the appropriate zome calls on initialization', async () => {
    await wait(1000)
    expect(callRegistry).toEqual({
      'chat.list_all_messages': 'done',
    })

    delete callRegistry['chat.list_all_messages']
    expect(callRegistry).toEqual({})

    const [loginButton] = await findElementsByText('span', 'Login', page)
    await loginButton.click()

    await page.waitForSelector('iframe')
    const iframe = await findIframe(page, chaperoneUrlCheck.local)
    const chaperoneModal = await iframe.evaluateHandle(() => document)

    expect(callRegistry).toEqual({})

    await holoAuthenticateUser(iframe, chaperoneModal, HOSTED_AGENT.email, HOSTED_AGENT.password, 'signin')
    await wait(1500)

    expect(callRegistry).toEqual({
      'chat.list_all_messages': 'done',
      'chat.refresh_chatter': 'done',
      'profile.get_my_profile': 'done',
    })
  })
}, TIMEOUT)
