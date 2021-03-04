export const SCREENSHOT_PATH = "./snapshots";
export const TIMEOUT = 300000
export const POLLING_INTERVAL = 1000
export const HOSTED_AGENT = {
  email: 'alice@holo.host',
  password: '12344321'
}


// Puppeteer helpers
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

const escapeXpathString = str => {
  const splitedQuotes = str.replace(/'/g, `', "'", '`);
  return `concat('${splitedQuotes}', '')`;
}

export const findElementByText = async (element, text, page) => {
  const cleanedText = escapeXpathString(text).trim();
  const matches = await page.$x(`//${element}[contains(., ${cleanedText})]`)
  if (matches.length > 0) {
    console.log(' findElByText Matches >> ', matches);
    return matches
  }
  else throw Error(`Failed to find a match for element (${element}) with text (${text}) on page (${page}).`)
}
export const findElementByTextAndClass = async (element, className, text, page) =>{
  const matches = await page.$x(`//${element}[contains(@class='${className}', '${text}')]`)
  if (matches.length > 0) return matches[0]
  else throw Error(`Failed to find a match for element (${element}) with class (${className}) and text (${text}) on page (${page}).`)
}

export const toBeOnPage = async (container, text, page) => {
  let match
  try {
    match = await page.waitForFunction(
      text => document.querySelector(container).innerText.includes(text),
      {},
      text
    );
    console.log("Successfully found text: ", match);
  } catch (e) {
      console.error('Failed to find text on page. Error: ', e );
      match = null
  }
  return match
}
export const reload = page => page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] })


// Tryorama helpers
export const closeTestConductor = async (agent, testName) => {
  try {
    await agent._player.shutdown()
  } catch (err) {
    throw new Error(
      `Error when killing ${agent} conductor for the ${testName} test : ${err}`
    )
  }
}

export const waitZomeResult = async (
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
      console.log('callResult :', callResult)
      if (callResult) {
        clearInterval(poll)
        clearTimeout(timeoutId)
        resolve(callResult)
      }
    }, pollingInterval)
  })
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

export const waitLoad = async (checkLoading, pollingInterval = 1000) => {
  return new Promise(resolve => {
    const poll = setInterval(() => {
      const isLoaded = checkLoading()
      if (isLoaded) {
        clearInterval(poll)
        resolve(isLoaded)
      }
    }, pollingInterval)
  })
}

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