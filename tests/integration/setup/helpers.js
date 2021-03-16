/* global expect */
import path from 'path'
import { TIMEOUT, WEB_LOGGING, POLLING_INTERVAL, SCREENSHOT_PATH } from './globals'
import { INSTALLED_APP_ID } from '@/consts'
import { conductorConfig } from './tryorama'
import httpServers from './setupServers'
import wait from 'waait'

export const waitForState = async (stateChecker, desiredState, pollingInterval = 1000) => {
  return new Promise(resolve => {
    const poll = setInterval(() => {
      const currentState = stateChecker()
      if (currentState === desiredState) {
        console.log('State polling complete...')
        clearInterval(poll)
        resolve(currentState)
      }
      if (stateChecker() === undefined) {
        console.log('Current state is undefined. Verify that the zomeCall fn name is accurate and check to see that the call logs are still being output to the console.')
      }
      console.log(`Polling again. Current State: ${stateChecker()} | Desired state: ${desiredState}`)
    }, pollingInterval)
  })
}

/// Puppeteer helpers:
// --------------------
export const takeSnapshot = async (page, fileName) => page.screenshot({ path: SCREENSHOT_PATH + `/${fileName}.png` })
export const fetchPreformanceResults = async (page, console) => {
  // Executes Navigation API within the page context
  const metrics = await page.evaluate(() => JSON.stringify(window.performance))
  // Parses the result to JSON
  console.info(JSON.parse(metrics))
}
export const fetchAccesiblitySnapShot = async (page, console) => { // Captures the current state of the accessibility tree
  const snapshot = await page.accessibility.snapshot()
  console.info(snapshot)
  return snapshot
}

export const getElementProperty = async (element, property) => {
  return await (await element.getProperty(property)).jsonValue()
}

const escapeXpathString = str => {
  const splitedQuotes = str.replace(/'/g, `', "'", '`)
  return `concat('${splitedQuotes}', '')`
}

// returns JS DOM Element
export const findElementByText = async (element, text, page) => {
  const cleanedText = escapeXpathString(text).trim()
  const matches = await page.$x(`//${element}[contains(., ${cleanedText})]`)
  if (matches.length > 0) return matches
  else throw Error(`Failed to find a match for element (${element}) with text (${text}) on page (${page}).`)
}

export const findElementByClassandText = async (element, className, text, page) => {
  const matches = await page.$x(`//${element}[contains(concat(' ', @class, ' '), ' ${className} ') and contains(., '${text}')]`)
  if (matches.length > 0) return matches[0]
  else throw Error(`Failed to find a match for element (${element}) with class (${className}) and text (${text}) on page (${page}).`)
}

export const findIframe = async (page, urlRegex, pollingInterval = 1000) => {
  return new Promise(resolve => {
    const poll = setInterval(() => {
      const iFrame = page.frames().find(frame => urlRegex.test(frame.url()))
      if (iFrame) {
        clearInterval(poll)
        resolve(iFrame)
      }
    }, pollingInterval)
  })
}

/// Tryorama helpers:
// -------------------
export const awaitZomeResult = async (
  asyncCall,
  timeout = TIMEOUT,
  pollingInterval = POLLING_INTERVAL
) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Waited for ${timeout / 1000} seconds`, timeout))
    }, timeout)
    const poll = setInterval(async () => {
      const callResult = await asyncCall()
      if (callResult) {
        clearInterval(poll)
        clearTimeout(timeoutId)
        resolve(callResult)
      }
    }, pollingInterval)
  })
}

/// Holo Test helpers:
// -------------------
export const holoAuthenticateUser = async (frame, modalElement, email, password, type = 'signup') => {
  await frame.type(`#${type}-email`, email, { delay: 100 })
  const emailInput = await frame.$eval(`#${type}-email`, el => el.value)

  await frame.type(`#${type}-password`, password, { delay: 100 })
  const passwordInput = await frame.$eval(`#${type}-password`, el => el.value)

  let confirmationInput
  if (type === 'signup') {
    await frame.type(`#${type}-password-confirm`, password, { delay: 100 })
    confirmationInput = await frame.$eval(`#${type}-password-confirm`, el => el.value)
  }

  const [submitButton] = await findElementByText('button', 'Submit', modalElement)
  await submitButton.click()

  return { emailInput, passwordInput, confirmationInput }
}

/// Test Setup helpers:
// -------------------
export const registerNickname = async (page, webUserNick) => {
  await page.focus('.v-dialog')
  // add agent nickname
  await page.keyboard.type(webUserNick, { delay: 200 })
  const [submitButton] = await findElementByText('button', 'Let\'s Go', page)
  await submitButton.click()
  // verify page title
  const pageTitle = await page.title()
  expect(pageTitle).toBe('Elemental Chat')
}

const describeJsHandle = (jsHandle) => {
  return jsHandle.executionContext().evaluate(arg => {
    if (arg instanceof Error) return arg.message
    else return arg
  }, jsHandle)
}

export const beforeAllSetup = async (scenario, createPage, callRegistry) => {
  // Tryorama: instantiate player conductor
  console.log('Setting up players on elemental chat...')
  const [conductor] = await scenario.players([conductorConfig], false)

  await conductor.startup()

  conductor.setSignalHandler((_) => {
    console.log('Conductor Received Signal:', _)
  })

  
  // Tryorama: install elemental chat on both player conductors
  const bundlePath = path.join(__dirname, 'bundle', 'elemental-chat.happ')
  
  const aliceChatHapp = await conductor.installBundledHapp({ path: bundlePath }, null, INSTALLED_APP_ID)
  const bobboChatHapp = await conductor.installBundledHapp({ path: bundlePath }, null, 'second_agent')
  
  // Tryorama: grab chat cell from list of happ cells to use as the agent
  const [aliceChat] = aliceChatHapp.cells
  const [bobboChat] = bobboChatHapp.cells
  
  // Tryorama: alice declares self as chatter
  await aliceChat.call('chat', 'refresh_chatter', null)
  
  // locally spin up ui server only (not holo env)
  console.log('👉 Spinning up UI server')
  const { ports, close: closeServer } = httpServers()
  
  conductor.appWs().client.socket.onclose = async () => {
    // silence logs upon socket closing
    page.on('pageerror', _ => {})
    page.on('console',  _ => {})
  }

  const page = await createPage()

  page.once('domcontentloaded', () => console.info('✅ DOM is ready'))
  page.once('load', () => console.info('✅ Page is loaded'))
  page.once('close', () => console.info('✅ Page is closed'))
  if (WEB_LOGGING) {
    page.on('pageerror', error => {
      if (error instanceof Error) {
        console.log(`❌ ${error.message}`)
      } else {
        console.error(`❌ ${error}`)
      }
    })
  }
  page.on('console', async (message) => {
    if (WEB_LOGGING) {
      const args = await Promise.all(message.args().map(arg => describeJsHandle(arg)))
        .catch(error => {
          if (error.message.includes('Target closed')) return null
          console.log(error.message)
        })
      if (!args || args.join(' ').includes('Socket is closed')) return
      console.log('ℹ️  ', ...args)
    }
    try {
      const messageArray = message.text().split(' ')
      // determine if message is a registered api call
      if (parseInt(messageArray[0])) {
        messageArray.shift()
        const callDesc = messageArray.join(' ')
        const callAction = messageArray.pop()
        const isCallAction = callAction === 'start' || callAction === 'done'
        if (isCallAction) {
          if (messageArray.length > 1 && !callDesc.includes('zomeCall')) return
          const callName = messageArray[0]
          // set the call with most current action state
          callRegistry[callName] = callAction
        }
      }
    } catch (error) {
      // if error, do nothing - message is not a logged call
      return
    }
  })

  // Puppeteer: emulate avg desktop viewport
  await page.setViewport({ width: 952, height: 968 })
  await Promise.all([
    page.goto(`http://localhost:${ports.ui}/dist/index.html`),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ])

  return { aliceChat, bobboChat, page, closeServer, conductor }
}

export const afterAllSetup = async (conductor, closeServer) => {
  console.log('👉 Shutting down tryorama player conductor(s)...')
  await conductor.shutdown()
  console.log('✅ Closed tryorama player conductor(s)')

  console.log('👉 Closing the UI server...')
  await closeServer()
  console.log('✅ Closed the UI server...')
}
