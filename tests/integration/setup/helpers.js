import path from 'path'
import { TIMEOUT, POLLING_INTERVAL, WEB_LOGGING, SCREENSHOT_PATH, WAITTIME } from './globals'
import { INSTALLED_APP_ID } from '@/consts'
import { aliceConductorConfig, otherConductorConfig } from './tryorama'
import httpServers from './setupServers'
import wait from 'waait'

export const waitForState = async (stateChecker, desiredState, callName, callRegistryCb = () => null, pollingInterval = 1000, timeout = 9000) => {
  return Promise.race([
    new Promise(resolve => {
      const poll = setInterval(() => {
        const currentState = stateChecker()
        if (currentState === desiredState) {
          console.log('State polling complete...')
          clearInterval(poll)
          resolve(currentState)
        }
        if (stateChecker() === undefined) {
          console.log(`Current state for ${callName} is undefined. Verify that the zomeCall fn name is accurate and check to see that the call logs are still being output to the console.`)
        }
        const registry = callRegistryCb()
        console.log('callRegistry : ', registry)
        console.log(`Polling again for ${callName}. Current State: ${stateChecker()} | Desired state: ${desiredState}`)
      }, pollingInterval)
    }),
    new Promise((resolve, reject) => {
      let waitId = setTimeout(() => {
        resolve(new Error(`Unsuccessfully polled call state of ${callName} for ${timeout} ms.`))
      }, timeout)
    })
  ])
}

export const handleZomeCall = async (fn, params) => {
  try {
    return await fn(...params)
  } catch (error) {
    throw new Error(`Error when calling ${params[0]}.${params[1]}: ${error.toString()}`)
  }
}

/// Puppeteer helpers:
// --------------------
export const takeScreenshot = async (page, fileName) => page.screenshot({ path: SCREENSHOT_PATH + `/${fileName}.png` })
export const fetchPerformanceResults = async (page, console) => {
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
export const findElementsByText = async (element, text, page) => {
  const cleanedText = escapeXpathString(text).trim()
  const matches = await page.$x(`//${element}[contains(., ${cleanedText})]`)
  if (matches.length > 0) return matches
  else throw Error(`Failed to find a match for element (${element}) with text (${text}) on page (${page}).`)
}

export const findElementsByClassAndText = async (element, className, text, page) => {
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

export const getStats = async page => {
  // alice (web) clicks on get-stats
  await page.click('#get-stats')
  await wait(WAITTIME)
  let element = await page.$$('.display-1')

  const stats = []
  for (const e in element) {
    try {
      const text = await (
        await element[e].getProperty('textContent')
      ).jsonValue()
      stats.push(text)
    } catch (e) {
      console.log('error: ', e)
      continue
    }
  }

  const [closeButton] = await findElementsByText('button', 'Close', page)
  await closeButton.click()
  return {
    agents: stats[1].replace(' 👤', '').trim(),
    active: stats[3].replace(' 👤', '').trim(),
    channels: stats[5].replace(' 🗨️', '').trim(),
    messages: stats[7].replace(' 🗨️', '').trim(),
  }
}

/// Tryorama helpers:
// -------------------
export const awaitZomeResult = async (
  asyncCall,
  timeout = TIMEOUT,
  pollingInterval = POLLING_INTERVAL
) => {
  let timeoutId
  const callTimeout = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      clearTimeout(timeoutId)
      reject(new Error(`Waited for ${timeout / 1000} seconds`))
    }, timeout)
  })
  const fetchList = new Promise((resolve, reject) => {
    const poll = setInterval(async () => {
      const callResult = await asyncCall()
      if (callResult) {
        clearInterval(poll)
        clearTimeout(timeoutId)
        resolve(callResult)
      }
    }, pollingInterval)
  })
  return Promise.race([fetchList, callTimeout])
}

/// Holo Test helpers:
// -------------------
export const holoAuthenticateUser = async (frame, modalElement, email, password, type = 'signup') => {
  const id_prefix = type === 'signup' ? 'signup-' : ''

  await frame.type(`#${id_prefix}email`, email, { delay: 100 })
  const emailValue = await frame.$eval(`#${id_prefix}email`, el => el.value)

  await frame.type(`#${id_prefix}password`, password, { delay: 100 })
  const passwordValue = await frame.$eval(`#${id_prefix}password`, el => el.value)

  let confirmationValue, submitbuttonText
  if (type === 'signup') {
    submitbuttonText = 'Submit'
    await frame.type(`#${id_prefix}password-confirm`, password, { delay: 100 })
    confirmationValue = await frame.$eval(`#${id_prefix}password-confirm`, el => el.value)
  } else {
    submitbuttonText = 'Login'
  }

  const [submitButton] = await findElementsByText('button', submitbuttonText, modalElement)
  await submitButton.click()

  return { emailValue, passwordValue, confirmationValue }
}

/// Test Setup helpers:
// -------------------
export const registerNickname = async (page, webUserNick) => {
  // add agent nickname
  await page.keyboard.type(webUserNick, { delay: 200 })
  const [submitButton] = await findElementsByText('button', 'Let\'s Go', page)
  await submitButton.click()
}

const describeJsHandle = (jsHandle) => {
  return jsHandle.executionContext().evaluate(arg => {
    if (arg instanceof Error) return arg.message
    else return arg
  }, jsHandle)
}

export const BOBBO_INSTALLED_APP_ID = 'second_agent'

export const setupTwoChatters = async (scenario, createPage, callRegistry) => {
  // Tryorama: instantiate player conductor
  console.log('Setting up players on elemental chat...')
  const [aliceConductor, bobboConductor] = await scenario.players([aliceConductorConfig, otherConductorConfig])

  await scenario.shareAllNodes([aliceConductor, bobboConductor])

  aliceConductor.setSignalHandler(s => {
    console.log('Alice Conductor Received Signal:', s)
  })
  bobboConductor.setSignalHandler(s => {
    console.log('Bobbo Conductor Received Signal:', s)
  })

  // Tryorama: install elemental chat on both player conductors
  const bundlePath = path.join(__dirname, 'bundle', 'elemental-chat.happ')

  const aliceChatHapp = await aliceConductor.installBundledHapp({ path: bundlePath }, null, INSTALLED_APP_ID)
  const bobboChatHapp = await bobboConductor.installBundledHapp({ path: bundlePath }, null, BOBBO_INSTALLED_APP_ID)

  // Tryorama: grab chat cell from list of happ cells to use as the agent
  const [aliceChat] = aliceChatHapp.cells
  const [bobboChat] = bobboChatHapp.cells

  const startingStats = await aliceChat.call('chat', 'stats', { category: 'General' })

  await aliceChat.call('profile', 'update_my_profile', { nickname: 'Alice' + ' ' })

  // locally spin up ui server only (not holo env)
  console.log('👉 Spinning up UI server')
  const { ports, close: closeServer } = httpServers()

  aliceConductor.appWs().client.socket.onclose = async () => {
    // silence logs upon socket closing
    page.on('pageerror', _ => {})
    page.on('console', _ => {})
  }

  const page = await createPage()
  await setupPage(page, callRegistry, `http://localhost:${ports.ui}/dist/index.html`, { waitForNavigation: true })

  return { aliceChat, bobboChat, page, closeServer, aliceConductor, bobboConductor, startingStats }
}

export const setupPage = async (page, callRegistry, url) => {
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
    page.goto(url),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ])
}

export const afterAllSetup = async (aliceConductor, bobboConductor, closeServer) => {
  if (aliceConductor) {
    console.log('👉 Shutting down tryorama alice conductor...')
    await aliceConductor.shutdown()
    console.log('✅ Closed tryorama alice conductor')
  }
  if (bobboConductor) {
    console.log('👉 Shutting down tryorama bobbo conductor...')
    await bobboConductor.shutdown()
    console.log('✅ Closed tryorama bobbo conductor')
  }

  if (closeServer) {
    console.log('👉 Closing the UI server...')
    await closeServer()
    console.log('✅ Closed the UI server...')
  }
}
