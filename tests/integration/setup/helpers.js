import { TIMEOUT, INSTALLED_APP_ID, WEB_LOGGING, POLLING_INTERVAL, SCREENSHOT_PATH } from './globals'
import { conductorConfig, elChatDna } from './tryorama'
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
      console.log(`Polling again. Current State: ${stateChecker()} | Desired state: ${desiredState}`)
    }, pollingInterval)
  })
}

/// Puppeteer helpers:
// --------------------
export const reload = page => page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] })

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
export const closeTestConductor = async (agent, testName) => {
  try {
    await agent._player.shutdown()
  } catch (err) {
    return
    // throw new Error(
    //   `Error when killing ${agent} conductor for the ${testName} test : ${err}`
    // )
  }
}

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
  await wait(2000)
  // verify page title
  const pageTitle = await page.title()
  expect(pageTitle).toBe('Elemental Chat')
  // add agent nickname
  await page.focus('.v-dialog')
  await page.keyboard.type(webUserNick, { delay: 100 })
  const [submitButton] = await findElementByText('button', 'Let\'s Go', page)
  await submitButton.click()
}

export const beforeAllSetup = async (scenario, createPage, callRegistry) => {
  // Tryorama: instantiate player conductor
  console.log('Settng up players on elemental chat...')
  const [conductor] = await scenario.players([conductorConfig], false)
  await conductor.startup()

  conductor.setSignalHandler((_) => {
    console.log("Conductor Received Signal:",_)
  })

  // Tryorama: install elemental chat on both player conductors
  const [[aliceChatHapp]] = await conductor.installAgentsHapps([[{ hAppId: INSTALLED_APP_ID, dnas: [elChatDna] }]])
  const [[bobboChatHapp]] = await conductor.installAgentsHapps([[{ hAppId: 'second_agent', dnas: [elChatDna] }]])
  // Tryorama: grab chat cell from list of happ cells to use as the 'player'
  const [aliceChat] = aliceChatHapp.cells
  const [bobboChat] = bobboChatHapp.cells

  // Tryorama: alice declares self as chatter
  await aliceChat.call('chat', 'refresh_chatter', null)

  // locally spin up ui server only (not holo env)
  console.log('👉 Spinning up UI server');
  const { ports, close: closeServer } = httpServers()

  const page = await createPage()

  page.once('domcontentloaded', () => console.info('✅ DOM is ready'))
  page.once('load', () => console.info('✅ Page is loaded'))
  page.once('close', () => console.info('✅ Page is closed'))
  if (WEB_LOGGING) {
    page.on('pageerror', error => console.error(`❌ ${error}`))
    page.on('console', message => {
      try {
      const consoleMessage = message.text();
      console[message.type()](`ℹ️  ${consoleMessage}`)
      const messageArray = consoleMessage.split(' ')
        // determine if message is a registered api call
        if (parseInt(messageArray[0])) {
          messageArray.shift()
          const callDesc = messageArray.join(' ')
          const callAction = messageArray.pop()
          const isCallAction = callAction === 'start' || callAction === 'done'
          if (isCallAction) {
            if (messageArray.length > 1 && !callDesc.includes('zome')) return
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
  }

  // Puppeteer: emulate avg desktop viewport
  await page.setViewport({ width: 952, height: 968 })
  await Promise.all([
      page.goto(`http://localhost:${ports.ui}/dist/index.html`),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
  ]);
  await Promise.all([
      page.goto(`http://localhost:${ports.ui}/dist/index.html`),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
  ]);
  console.log('page loaded')
  return { aliceChat, bobboChat, page, closeServer, conductor }
}
