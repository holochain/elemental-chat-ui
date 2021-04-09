import { isHoloHosted, isHoloSelfHosted } from '@/utils'

export const RECONNECT_SECONDS = 15

export const APP_VERSION = process.env.VUE_APP_UI_VERSION

export const DNA_VERSION = process.env.VUE_APP_DNA_VERSION
export const DNA_UID = process.env.VUE_APP_DNA_UID

export const INSTALLED_APP_ID = process.env.VUE_APP_INSTALLED_APP_ID
  ? process.env.VUE_APP_INSTALLED_APP_ID
  : process.env.VUE_APP_WEB_CLIENT_PORT === '8888' // for development/testing: dev agent 1 is served at port 8888, and dev agent 2 at port 9999
    ? 'elemental-chat-1'
    : process.env.VUE_APP_WEB_CLIENT_PORT === '9999'
      ? 'elemental-chat-2'
      : `elemental-chat:${DNA_VERSION}${DNA_UID ? ':' + DNA_UID : ''}` // default to elemental-chat:<dna version number>:<uuid> (appId format for holo self-hosted)

export const WEB_CLIENT_PORT = process.env.VUE_APP_WEB_CLIENT_PORT || 8888

export const WEB_CLIENT_URI =
  isHoloHosted() || isHoloSelfHosted()
    ? `wss://${window.location.hostname}/api/v1/ws/`
    : `ws://localhost:${WEB_CLIENT_PORT}`
