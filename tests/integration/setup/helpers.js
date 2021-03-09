import { TIMEOUT, INSTALLED_APP_ID, WEB_LOGGING, POLLING_INTERVAL, SCREENSHOT_PATH } from './globals'
import { conductorConfig, elChatDna } from './tryorama'
import httpServers from './setupServers'

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

export const takeSnapshot = async (page, fileName) => page.screenshot({ path: SCREENSHOT_PATH + `/${fileName}.png` });
export const fetchPreformanceResults = async (page, console) => {
  // Executes Navigation API within the page context
  const metrics = await page.evaluate(() => JSON.stringify(window.performance));
  // Parses the result to JSON
  console.info(JSON.parse(metrics));
}
export const fetchAccesiblitySnapShot = async (page, console) => { // Captures the current state of the accessibility tree
  const snapshot = await page.accessibility.snapshot();
  console.info(snapshot);
  return snapshot
}

export const getElementProperty = async (element, property) => {
  return await (await element.getProperty(property)).jsonValue()
}

const escapeXpathString = str => {
  const splitedQuotes = str.replace(/'/g, `', "'", '`);
  return `concat('${splitedQuotes}', '')`;
}

// returns JS DOM Element
export const findElementByText = async (element, text, page) => {
  const cleanedText = escapeXpathString(text).trim();
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


// the below is copied from helper created in hosted-scalability-tests
// note: team to consider making module out of helper fns
const getVisibleInputByLabelText = async (frame, desiredLabelText) => {
  const labels = (await frame.$$('label'))
  for (const label of labels) {
    if ((await label.boundingBox()) === null) {
      console.log('skipping label')
      continue
    }
    const labelText = await getText(label)
    console.log(`label text: ${labelText}`)
    if (labelText === desiredLabelText) {
      const labelForText = await label.evaluate(label =>
        CSS.escape(label.htmlFor)
      )
      console.log(`waiting for "input#${labelForText}"`)
      const input = (await frame.waitForSelector(`input#${labelForText}`, {
        visible: true
      }))
      return input
    }
  }
}


/// Tryorama helpers:
// -------------------
export const closeTestConductor = async (agent, testName) => {
  try {
    await agent._player.shutdown()
  } catch (err) {
    throw new Error(
      `Error when killing ${agent} conductor for the ${testName} test : ${err}`
    )
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
export const holoAuthenticateUser = async (modalElement, email, password, type = 'signup') => {
  const createCredentialsLink = await findElementByText('a', 'Create credentials', modalElement)
  await createCredentialsLink.click()

  const emailInput = await getVisibleInputByLabelText(modalElement, 'EMAIL:')
  await emailInput.type(email)

  const passwordInput = await getVisibleInputByLabelText(chaperoneModal, 'CREATE PASSWORD:')
  await passwordInput.type(password)    
  let confirmationInput
  if (type === 'signup') {
    const confirmationInput = await getVisibleInputByLabelText(chaperoneModal, 'RE-ENTER PASSWORD:')
    await confirmationInput.type(password)
  }

  const submitButton = await findElementByText('button', 'Submit', modalElement)
  await submitButton.click()
  await delay(500)
  await modalElement.dispose()

  return { emailInput, passwordInput, confirmationInput }
}

/// Test Setup helpers:
// -------------------
export const beforeAllSetup = async (scenario, createPage, callRegistry) => {
  // Tryorama: instantiate player conductor
  console.log('Settng up players on elemental chat...')
  const [alice] = await scenario.players([conductorConfig], false)
  await alice.startup()
  
  // Tryorama: install elemental chat on both player conductors
  const [[aliceChatHapp]] = await alice.installAgentsHapps([[{ hAppId: INSTALLED_APP_ID, dnas: [elChatDna] }]]);
  // Tryorama: grab chat cell from list of happ cells to use as the 'player'
  let aliceChat;
  ([aliceChat] = aliceChatHapp.cells);

  // Tryorama: alice declares self as chatter
  await aliceChat.call('chat', 'refresh_chatter', null);

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
      const consoleMessage = message.text();
      console[message.type()](`ℹ️  ${consoleMessage}`)
      const messageArray = consoleMessage.split(' ')
      try {
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
  await page.goto(`http://localhost:${ports.ui}/dist/index.html`)

  return { aliceChat, page, closeServer }
}