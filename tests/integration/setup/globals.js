export const TIMEOUT = 120_000
export const WAITTIME = 6_000
export const SCREENSHOT_PATH = './screenshots'
export const POLLING_INTERVAL = 1_000
export const WEB_LOGGING = process.env.VUE_APP_WEB_LOGS === 'true'
export const CHAPERONE_URL_REGEX = /^https?:\/\/chaperone\w*\.holo\.host/
export const CHAPERONE_URL_REGEX_HCC = /^http:\/\/localhost:24274/
export const HOSTED_AGENT = {
  email: 'alice@holo.host',
  password: '12344321'
}
