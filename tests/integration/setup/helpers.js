export const SCREENSHOT_PATH = "./snapshots";
export const TIMEOUT = 300000
export const POLLING_INTERVAL = 1000
export const HOSTED_AGENT = {
  email: 'alice@holo.host',
  password: '12344321'
}

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

export const findIframe = async (page, url, pollingInterval = 1000) => {
  return new Promise(resolve => {
    const poll = setInterval(() => {
      const iFrame = page.frames().find(frame => frame.url().includes(url))
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

  console.log('ASYNC CALL : ', asyncCall)
  console.log('------------------------> 3') 

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Waited for ${timeout / 1000} seconds`, timeout))
    }, timeout)
    const poll = setInterval(async () => {
      console.log('------------------------> 4') 
      const callResult = await asyncCall()
      console.log('------------------------> 5') 

      console.log('callResult :', callResult)
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
export const holoAuthenticateUser = async (page, frame, userEmail = '', userPassword = '', type = 'signup') => {
  console.log('INSIDE OF AUTH USER FUN ... ')
  const pascalType = type === 'signup' ? 'SignUp' : 'LogIn'
  await frame.click(`button[onclick="show${pascalType}()"]`)
  await wait(100)
  await frame.type(`#${type}-email`, userEmail, { delay: 100 })
  await frame.type(`#${type}-password`, userPassword, { delay: 100 })
  const email = await frame.$eval(`#${type}-email`, el => el.value)
  const password = await frame.$eval(`#${type}-password`, el => el.value)

  let confirmation
  if (type === 'signup') {
    await frame.type(`#${type}-password-confirm`, userPassword, { delay: 100 })
    confirmation = await frame.$eval(`#${type}-password-confirm`, el => el.value)
  }

  await takeSnapshot(page, `${type}Modal`)

  const buttonTypeIndex = type === 'signup' ? 1 : 0
  const submitButtons = await frame.$$('button[onclick="formSubmit()"]')
  const SignUpButton = submitButtons[buttonTypeIndex]
  SignUpButton.click()

  return { email, password, confirmation }
}


  // const amount = await page.$eval(`.v-list-item`, el => el.innerHTML)
  // console.log('CHECK#1 >>>>>>>>>>>>>>>>>>>', amount)
  // const note = await page.$eval(`.v-list-item`, el => el.value)
  // console.log('CHECK#2 >>>>>>>>>>>>>>>>>>>', note)