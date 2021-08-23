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

export const formPaginationDateTime = message => {
  // set datetime string for polling reference
  const convertedDatetime = new Date(message.createdAt[0] * 1000)
  return `${convertedDatetime.toLocaleString('default', { month: 'long' })} ${convertedDatetime.getDate()} ${convertedDatetime.getFullYear()}`
}

export const shouldAllowPagination = (container, channel) => {
  // conditionally show button
  return container.scrollTop === 0 && (channel.currentMessageCount !== channel.totalMessageCount)
}

// NB: This is a hack to cleanly monitor ws calls in puppeteer

// As we no longer use json-rpc calls, we no longer have a unique id associated with each call.
// TODO: Once following two puppeteer issues are resolved, update to use Network.webSocketFrame methods
// to monitor and intercept the traffic instead.
// issue 1: https://github.com/puppeteer/puppeteer/issues/2974
// issue 2: https://github.com/puppeteer/puppeteer/issues/2470
export const logZomeCall = (zomeName, zomeCallName, callAction) => {
  if (!process.env.NODE_ENV === 'test') return
  console.log(
    `${Date.now()} ${zomeName}.${zomeCallName} zomeCall ${callAction}`
  )
}
export const actionType = Object.freeze({ START: 'start', DONE: 'done' })

// "source chain head moved" means that when our zome call finished processing
// and tried to commit its changes to the source chain,
// another zome call had already modified the source chain.
// We should retry automatically in cases where the user can't retry manually.
export const retryIfSourceChainHeadMoved = async call => {
  let intervalMs = 50
  while (true) {
    try {
      return await call()
    } catch (e) {
      const isHeadMovedError = e
        .toString()
        .includes('source chain head has moved')
      console.log('isHeadMovedError', isHeadMovedError)
      if (isHeadMovedError) {
        intervalMs *= 2 + Math.random()
        await wait(intervalMs)
      } else {
        throw e
      }
    }
  }
}

class CustomError extends Error {
  constructor (...params) {
    super(...params)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class TimeoutError extends CustomError {}
export class UndefinedClientError extends CustomError {}
export class HoloError extends CustomError {}
