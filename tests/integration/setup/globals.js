export const INSTALLED_APP_ID = 'elemental-chat:alpha19:0001'
export const TIMEOUT = 300000
export const SCREENSHOT_PATH = "./snapshots";
export const POLLING_INTERVAL = 1000
export const HOSTED_AGENT = {
  email: 'alice@holo.host',
  password: '12344321'
}
export const WEB_LOGGING = process.env.VUE_APP_WEB_LOGS === 'true'
? true
: false