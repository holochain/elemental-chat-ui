import wait from 'waait'

export const arrayBufferToBase64 = buffer => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// NB: This is a hack to cleanly monitor ws calls in puppeteer

// As we no longer use json-rpc calls, we no longer have a unique id associated with each call.
// TODO: Once following two puppeteer issues are resolved, update to use Network.webSocketFrame methods
// to monitor and intercept the traffic instead.
// issue 1: https://github.com/puppeteer/puppeteer/issues/2974
// issue 2: https://github.com/puppeteer/puppeteer/issues/2470
export const logZomeCall = (zomeName, zomeCallName, callAction) => {
  if (!process.env.NODE_ENV === 'test') return
  console.log(`${Date.now()} ${zomeName}.${zomeCallName} zomeCall ${callAction}`)
}
export const actionType = Object.freeze({ START: 'start', DONE: 'done' })

// "source chain head moved" means that when our zome call finished processing
// and tried to commit its changes to the source chain,
// another zome call had already modified the source chain.
// We should retry automatically in cases where the user can't retry manually.
export const retryIfSourceChainHeadMoved = async call => {
  let intervalMs = 50
  while (true) {
    const val = await call()
    const isHeadMovedError =
      val &&
      val.type === 'error' &&
      val.payload &&
      val.payload.message &&
      val.payload.message.includes('source chain head has moved')
    console.log('isHeadMovedError', isHeadMovedError)
    if (isHeadMovedError) {
      intervalMs *= (2 + Math.random())
      await wait(intervalMs)
    } else {
      return val
    }
  }
}

class CustomError extends Error {
  constructor(...params) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class UndefinedClientError extends CustomError {}
export class HoloError extends CustomError {}

export const retryUntilClientIsDefined = async (call, maxTries = 20) => {
  let tries = 0
  while (true) {
    let val
    try {
      tries++
      val = await call()
      return val
    } catch (e) {
      if (e instanceof UndefinedClientError && tries < maxTries) {
        await wait(500)
      } else {
        return val
      }
    }
  }
}
