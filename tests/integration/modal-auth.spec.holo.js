/* global it, describe, expect, beforeAll, afterAll */
import wait from 'waait'
import { TIMEOUT, WAITTIME, HOSTED_AGENT, CHAPERONE_URL_REGEX, CHAPERONE_URL_REGEX_HCC } from './setup/globals'
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
    await setupPage(page, callRegistry, `http://localhost:${serverPorts.ui}/dist/index.html`, { waitForNavigation: true })
    await wait(500)

    const stats = await getStats(page)

    console.log('GOT STATs', stats)
    expect(stats).toEqual({
      agents: '0',
      active: '0',
      channels: '0',
      messages: '0'
    })
  })

  it('can sign up, make zome call, log out, and sign back in', async () => {
    await setupPage(page, callRegistry, `http://localhost:${serverPorts.ui}/dist/index.html?signup`, { waitForNavigation: true })
    await wait(WAITTIME)

    // verify page
    const pageTitle = await page.title()
    expect(pageTitle).toBe('Elemental Chat')



    // Wait for "Connecting to HoloPort..." overlay to disappear
    // const [loginButton] = await findElementsByText('span', 'Login', page)
    // await loginButton.click()

    // *********
    // Sign Up and Log Into hApp
    // *********
    // wait for the modal to load
    await wait(WAITTIME)

    await page.waitForSelector('iframe')
    const iframe = await findIframe(page, chaperoneUrlCheck.local)
    const chaperoneModal = await iframe.evaluateHandle(() => document)
    await wait(1_000)


    const [loginTitle] = await findElementsByText('h1', 'Elemental Chat', chaperoneModal)
    expect(loginTitle).toBeTruthy()

    await holoAuthenticateUser(iframe, chaperoneModal, HOSTED_AGENT.email, HOSTED_AGENT.password, 'signup')

    // Wait for signup to complete
    await wait(WAITTIME)

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
    await wait(3000)

    const [nickname2] = await findElementsByText('div', 'AliceHosted', page)
    expect(nickname2).toBeTruthy()

    const [logoutButton2] = await findElementsByText('span', 'Logout', page)
    await logoutButton2.click()
  })

  it('makes the appropriate zome calls on initialization', async () => {
    await setupPage(page, callRegistry, `http://localhost:${serverPorts.ui}/dist/index.html`, { waitForNavigation: true })
    expect(callRegistry).toEqual({
      'chat.list_channels': 'done'
    })

    delete callRegistry['chat.list_channels']
    expect(callRegistry).toEqual({})

    const [loginButton] = await findElementsByText('span', 'Login', page)
    await loginButton.click()

    await page.waitForSelector('iframe')
    const iframe = await findIframe(page, chaperoneUrlCheck.local)
    const chaperoneModal = await iframe.evaluateHandle(() => document)

    expect(callRegistry).toEqual({})

    await holoAuthenticateUser(iframe, chaperoneModal, HOSTED_AGENT.email, HOSTED_AGENT.password, 'signin')
    await wait(1500)

    console.log('callRegistry : ', callRegistry)

    // await wait(60_000)

    expect(callRegistry).toEqual({
      'chat.list_channels': 'done',
      'chat.refresh_chatter': 'done',
      'profile.get_my_profile': 'done'
    })

    const [logoutButton] = await findElementsByText('span', 'Logout', page)
    await logoutButton.click()
  })

  it('renders the sign-up page when provided sign-up uri search param', async () => {
    await setupPage(page, callRegistry, `http://localhost:${serverPorts.ui}/dist/index.html?signup`, { waitForNavigation: true })
    await wait(1000)

    // verify page
    const pageTitle = await page.title()
    expect(pageTitle).toBe('Elemental Chat')

    // *****************
    // Arrive on Sign Up
    // *****************
    // wait for the modal to load
    await page.waitForSelector('iframe')
    const iframe = await findIframe(page, chaperoneUrlCheck.local)
    const chaperoneModal = await iframe.evaluateHandle(() => document)

    let onSignUpPage = true
    try {
      // await wait(60_000)
      const [signUpTitle] = await findElementsByText('h3', 'Create Login Credentials', chaperoneModal)
      await signUpTitle.click()
    } catch (error) {
      console.log('error : ', error)
      onSignUpPage = false
    }
    expect(onSignUpPage).toBe(true)

    let onSignInPage = true
    try {
      const [signUpTitle] = await findElementsByText('h1', 'Elemental Chat Login', chaperoneModal)
      await signUpTitle.click()
    } catch (error) {
      onSignInPage = false
    }
    expect(onSignInPage).toBe(false)
  })

  it('renders the sign-in page when provided sign-in uri search param', async () => {
    await setupPage(page, callRegistry, `http://localhost:${serverPorts.ui}/dist/index.html?login`, { waitForNavigation: true })
    await wait(1000)

    // verify page
    const pageTitle = await page.title()
    expect(pageTitle).toBe('Elemental Chat')

    // *****************
    // Arrive on Sign In
    // *****************
    // wait for the modal to load
    await page.waitForSelector('iframe')
    const iframe = await findIframe(page, chaperoneUrlCheck.local)
    const chaperoneModal = await iframe.evaluateHandle(() => document)

    let onSignUpPage = true
    try {
      const [signUpTitle] = await findElementsByText('h3', 'Create Login Credentials', chaperoneModal)
      await signUpTitle.click()
    } catch (error) {
      onSignUpPage = false
    }
    expect(onSignUpPage).toBe(false)

    let onSignInPage = true
    try {
      const [signUpTitle] = await findElementsByText('h1', 'Elemental Chat Login', chaperoneModal)
      await signUpTitle.click()
    } catch (error) {
      console.log('error : ', error)
      onSignInPage = false
    }
    expect(onSignInPage).toBe(true)
  })
}, TIMEOUT)
