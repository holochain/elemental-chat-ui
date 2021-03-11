export const arrayBufferToBase64 = buffer => {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

// NB: This is a hack to cleanly montior ws calls in puppeteer
// As we no longer use json-rpc calls, we no longer have a unique id associated with each call.
// TODO: Once following two puppeteer issues are resolved, update to use Network.webSocketFrame methods
// to monitor and intercept the traffice instead.
// issue 1: https://github.com/puppeteer/puppeteer/issues/2974
// issue 2: https://github.com/puppeteer/puppeteer/issues/2470
export const logZomeCall = (zomeCallName, callAction) => {
  console.log(`${Date.now()} ${zomeCallName} zomeCall ${callAction}`)
}
export const actionType = Object.freeze({ START: 'start', DONE: 'done' })
