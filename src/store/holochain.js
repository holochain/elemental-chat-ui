import { AppWebsocket } from '@holochain/conductor-api'
import { Connection as WebSdkConnection } from '@holo-host/web-sdk'
import { isHoloHosted, log, toUint8Array } from '@/utils'
import {
  RECONNECT_SECONDS,
  APP_VERSION,
  INSTALLED_APP_ID,
  WEB_CLIENT_PORT,
  WEB_CLIENT_URI
} from '@/consts'
import { arrayBufferToBase64 } from './utils'
import { handleSignal } from './elementalChat'
import { inspect } from 'util'
import wait from 'waait'

console.log('APP_CONTEXT : ', process.env.VUE_APP_CONTEXT)
console.log('INSTALLED_APP_ID : ', INSTALLED_APP_ID)

if (process.env.VUE_APP_CHAPERONE_SERVER_URL !== undefined) {
  console.log('CHAPERONE_SERVER_URL', process.env.VUE_APP_CHAPERONE_SERVER_URL)
}

if (WEB_CLIENT_URI !== undefined) {
  console.log('WEB_CLIENT_URI : ', WEB_CLIENT_URI)
}

// commit, dispatch and state (unused) here are relative to the holochain store, not the global store
const initializeClientLocal = async (commit, dispatch, _) => {
  try {
    const holochainClient = await AppWebsocket.connect(
      WEB_CLIENT_URI,
      20000,
      signal => handleSignal(signal, dispatch)
    )
    const appInfo = await holochainClient.appInfo({
      installed_app_id: INSTALLED_APP_ID
    })

    commit('setAppInfo', appInfo)

    commit('setHolochainClient', holochainClient)
    dispatch('elementalChat/refreshChatter', null, { root: true })

    holochainClient.client.socket.onclose = function (e) {
      // TODO: decide if we would like to remove this clause:
      // whenever we disconnect from conductor (in dev setup - running 'holochain-conductor-api'),
      // we create new keys... therefore the identity shouold not be held inbetween sessions
      // ^^ NOTE: this no longer true with hc cli.
      commit('resetHolochainConnectionState')
      console.log(
        `Socket is closed. Reconnect will be attempted in ${RECONNECT_SECONDS} seconds.`,
        e.reason
      )
      commit('setReconnecting', RECONNECT_SECONDS)
    }
  } catch (e) {
    log('Connection Error ', e)
    commit('setReconnecting', RECONNECT_SECONDS)
  }
}

function conductorConnected (state) {
  return state.reconnectingIn === -1
}

export default {
  namespaced: true,
  state: {
    holochainClient: null,
    holoClient: null,
    // empty, connecting_to_host, failed_to_load_chaperone, holo_initialized, loading_info, ready
    holoStatus: 'empty',
    isHoloAnonymous: null,
    conductorDisconnected: true,
    reconnectingIn: null,
    dnaHash: null,
    agentKey: null,
    dnaAlias: null,
    isLoading: {},
    hostUrl: ''
  },
  actions: {
    initialize ({ commit, dispatch, state }) {
      if (isHoloHosted()) {
        commit('connectingHolo')
        const webSdkConnection = new WebSdkConnection(
          process.env.VUE_APP_CHAPERONE_SERVER_URL,
          signal => handleSignal(signal, dispatch),
          {
            logo_url: 'img/ECLogoWhiteMiddle.png',
            app_name: 'Elemental Chat',
            info_link: 'https://holo.host/faq-tag/elemental-chat'
          }
        )

        webSdkConnection.addListener('disconnected', () =>
          commit('disconnectedFromHost')
        )
        // 'signin'/'signup' gets emitted before 'connected', therefore if connected is emitted without those, we are anonymous.
        webSdkConnection.addListener('connected', () => {
          dispatch('holoInitialized', { anonymous: true })
          dispatch('loadHoloAppInfo')
        })
        webSdkConnection.addListener('signin', () =>
          dispatch('holoInitialized', { anonymous: false })
        )
        webSdkConnection.addListener('signup', () =>
          dispatch('holoInitialized', { anonymous: false })
        )

        commit('createHoloClient', { webSdkConnection })
        state.holoCient.ready().catch(e => {
          console.error('Failed to load chaperone:', e)
          commit('failedToLoadChaperone')
        })
      } else {
        initializeClientLocal(commit, dispatch, state)

        // refresh chatter state every 2 hours
        setInterval(function () {
          if (conductorConnected(state)) {
            dispatch('elementalChat/refreshChatter')
          }
        }, 1000 * 60 * 60 * 2)
      }
    },
    skipBackoff ({ commit }) {
      commit('setReconnecting', 0)
    },
    resetHolochainConnectionState ({ commit }) {
      commit('resetHolochainConnectionState')
    },
    holoInitialized ({ commit, dispatch, state }, { anonymous }) {
      commit('holoInitialized')
      if (state.isHoloAnonymous === null) {
        commit('setHoloAnonymous', anonymous)
      }

      dispatch('loadHoloAppInfo')
    },
    async loadHoloAppInfo ({ commit }) {
      commit('loadingAppInfo')
      const RETRY_INTERVAL = 500
      let appInfo
      while (!appInfo) {
        try {
          appInfo = await holoCient.appInfo()
          break
        } catch (e) {
          console.error(e)
          await wait(RETRY_INTERVAL)
        }
      }

      commit('setAppInfo', appInfo)
    },
    async loadHostInfo ({ commit }) {
      const { url } = await holoClient.holoInfo()
      commit('setHostUrl', url)
    },
    async holoLogout ({ commit, state }) {
      if (state.isHoloAnonymous !== false) {
        throw new Error(
          `cannot log out without being logged in (isHoloAnonymous === ${state.isHoloAnonymous})`
        )
      }
      commit('elementalChat/setAgentHandle', null, { root: true })
      commit('holoLogout')
      await state.holoClient.signOut()
    },
    async holoLogin ({ commit }) {
      if (state.isHoloAnonymous !== true) {
        throw new Error(
          `cannot log in without being anonymous (isHoloAnonymous === ${state.isHoloAnonymous})`
        )
      }
      await state.holoCient.signIn()
    },
    callIsLoading ({ commit }, payload) {
      commit('updateIsLoading', { fnName: payload, value: true })
    },
    callIsNotLoading ({ commit }, payload) {
      commit('updateIsLoading', { fnName: payload, value: false })
    }
  },
  mutations: {
    connectingHolo (state) {
      if (state.holoStatus !== 'empty') {
        throw new Error(`connectingHolo: unexpected state ${state.holoStatus}`)
      }
      state.holoStatus = 'connecting_to_host'
      log(`connecting to host; setting holoStatus = ${state.holoStatus}`)
    },
    disconnectedFromHost (state) {
      state.holoStatus = 'connecting_to_host'
      log(`disconnected from host; setting holoStatus = ${state.holoStatus}`)
    },
    setHoloAnonymous (state, anonymous) {
      state.isHoloAnonymous = anonymous
      log(`setting isHoloAnonymous = ${state.isHoloAnonymous}`)
    },
    holoInitialized (state) {
      if (state.holoStatus === 'connecting_to_host') {
        state.holoStatus = 'holo_initialized'
        log(`holo initialized; setting holoStatus = ${state.holoStatus}`)
      }
    },
    failedToLoadChaperone (state) {
      if (state.holoStatus !== 'connecting_to_host') {
        throw new Error(
          `could not set state to failed_to_load_chaperone: unexpected state ${state.holoStatus}`
        )
      }
      state.holoStatus = 'failed_to_load_chaperone'
      log(`failed to load chaperone; setting holoStatus = ${state.holoStatus}`)
    },
    createHoloClient (state, { webSdkConnection }) {
      if (state.holoCient) {
        throw new Error(
          `createHoloClient: unexpected pre-existing holoClient ${inspect(
            state.holoCient
          )}`
        )
      }
      // We can't store the webSdkConnection object directly in vuex, so store this wrapper instead
      state.holoClient = {
        signUp: (...args) => webSdkConnection.signUp(...args),
        signIn: (...args) => webSdkConnection.signIn(...args),
        signOut: (...args) => webSdkConnection.signOut(...args),
        appInfo: (...args) =>
          webSdkConnection.appInfo(...args).then(pkg => {
            if (pkg.type === 'error') {
              throw new Error(`Failed to get appInfo: ${inspect(pkg)}`)
            } else {
              return pkg
            }
          }),
        ready: (...args) => webSdkConnection.ready(...args),
        zomeCall: (...args) => webSdkConnection.zomeCall(...args),
        holoInfo: (...args) => webSdkConnection.holoInfo(...args)
      }
    },
    loadingAppInfo (state) {
      if (state.holoStatus !== 'holo_initialized') {
        throw new Error('todo')
      }
      state.holoStatus = 'loading_info'
      log(
        `beginning to load app info; setting holoStatus = ${state.holoStatus}`
      )
      if (state.dnaAlias !== null) {
        state.holoStatus = 'ready'
        log(
          `already loaded dnaAlias from earlier; setting holoStatus = ${state.holoStatus}`
        )
      }
    },
    setAppInfo (state, appInfo) {
      const {
        cell_data: [
          {
            cell_id: [dnaHash, agentId],
            cell_nick
          }
        ]
      } = appInfo

      state.dnaAlias = cell_nick
      log(`dnaAlias = ${state.dnaAlias}`)
      state.dnaHash = Buffer.from(dnaHash)
      log(`dnaHash = ${state.dnaAlias.toString('base64')}`)
      state.agentKey = Buffer.from(agentId)
      log('agentKey = ', state.agentKey.toString('base64'))

      if (state.holoStatus === 'loading_info') {
        state.holoStatus = 'ready'
        log(
          `finished loading app info; setting holoStatus = ${state.holoStatus}`
        )
      }
    },
    setReconnecting (state, payload) {
      state.reconnectingIn = payload
    },
    setHolochainClient (state, payload) {
      state.holochainClient = payload
      state.conductorDisconnected = false
      state.reconnectingIn = -1
    },
    holoLogout (state) {
      state.agentKey = null
      state.isHoloAnonymous = true
    },
    resetHolochainConnectionState (state) {
      state.holochainClient = null
      state.conductorDisconnected = true
      state.reconnectingIn = RECONNECT_SECONDS
    },
    // this currently only track the function name. For a dna with multiple zomes the function names should be nested inside zome names
    updateIsLoading (state, { fnName, value }) {
      state.isLoading = {
        ...state.isLoading,
        [fnName]: value
      }
    },
    setHostUrl (state, payload) {
      state.hostUrl = payload
    }
  }
}
