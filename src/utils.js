export function isHoloHosted () {
  return process.env.VUE_APP_CONTEXT === 'holo-host'
}

export function isHoloSelfHosted () {
  return process.env.VUE_APP_CONTEXT === 'self-hosted'
}

export function isAnonymousEnabled () {
  return process.env.VUE_APP_ANONYMOUS === 'enabled'
}

export function toUint8Array (value) {
  if (!value) throw new Error("No value provided to 'toUnit8Array' function")
  if (!!value.type && value.type === 'Buffer') {
    return Uint8Array.from(value.data)
  } else {
    return value
  }
}

export const delay = milliseconds => {
  const date = Date.now()
  let currentDate = null
  do {
    currentDate = Date.now()
  } while (currentDate - date < milliseconds)
}

export function log (action, ...rest) {
  console.log(Date.now(), action)
  if (rest.length > 0) console.log(...rest)
}
