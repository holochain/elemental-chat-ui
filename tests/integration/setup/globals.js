export const TIMEOUT = 300000
export const WAITTIME = 2000
export const SCREENSHOT_PATH = './screenshots'
export const POLLING_INTERVAL = 1000
export const WEB_LOGGING = process.env.VUE_APP_WEB_LOGS === 'true'
export const CHAPERONE_URL_REGEX = /^https?:\/\/chaperone\w*\.holo\.host/
export const CHAPERONE_URL_REGEX_DEV = /^http:\/\/localhost:24273/
export const HOSTED_AGENT = {
  email: 'alice@holo.host',
  password: '12344321'
}
