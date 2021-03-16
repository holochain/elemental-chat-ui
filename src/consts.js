import { isHoloHosted, isHoloSelfHosted } from '@/utils'

export const RECONNECT_SECONDS = 15

export const APP_VERSION = process.env.VUE_APP_UI_VERSION

export const DNA_VERSION = 'alpha19'
export const DNA_UUID = '0001'

export const INSTALLED_APP_ID = process.env.VUE_APP_INSTALLED_APP_ID
  ? process.env.VUE_APP_INSTALLED_APP_ID
  : process.env.VUE_APP_WEB_CLIENT_PORT === '8888' // for development/testing: dev agent 1 is served at port 8888, and dev agent 2 at port 9999
    ? 'elemental-chat-1'
    : process.env.VUE_APP_WEB_CLIENT_PORT === '9999'
      ? 'elemental-chat-2'
      : `elemental-chat:${DNA_VERSION}${DNA_UUID ? ':' + DNA_UUID : ''}` // default to elemental-chat:<dna version number>:<uuid> (appId format for holo self-hosted)

export const WEB_CLIENT_PORT = process.env.VUE_APP_WEB_CLIENT_PORT || 8888

export const WEB_CLIENT_URI =
  isHoloHosted() || isHoloSelfHosted()
    ? `wss://${window.location.hostname}/api/v1/ws/`
    : `ws://localhost:${WEB_CLIENT_PORT}`

// this dna_alias should be whatever is set in HHA
// export const HOLO_DNA_ALIAS = 'uhCkkmrkoAHPVf_eufG7eC5fm6QKrW5pPMoktvG5LOC0SnJ4vV1Uv-0'

// TODO: make the content of this var dynamic / aware of the present env
// NB: this holo-dna-alias is only used to test with hc sandbox (verify matches id in happ.yaml)
export const HOLO_DNA_ALIAS = 'elemental-chat'
