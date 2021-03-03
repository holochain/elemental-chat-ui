import { AppWebsocket } from '@holochain/conductor-api'
import { Connection as WebSdkConnection } from '@holo-host/web-sdk'
import { isHoloHosted, isHoloSelfHosted, log } from '@/utils'
import { arrayBufferToBase64 } from './utils'
import { handleSignal } from './elementalChat'

const RECONNECT_SECONDS = 15

const APP_VERSION = process.env.VUE_APP_UI_VERSION

const DNA_VERSION = 'alpha19'
const DNA_UUID = '0001'

const INSTALLED_APP_ID = process.env.VUE_APP_INSTALLED_APP_ID
  ? process.env.VUE_APP_INSTALLED_APP_ID
  : process.env.VUE_APP_WEB_CLIENT_PORT === '8888' // for development/testing: dev agent 1 is served at port 8888, and dev agent 2 at port 9999
    ? 'elemental-chat-1'
    : process.env.VUE_APP_WEB_CLIENT_PORT === '9999'
      ? 'elemental-chat-2'
      : `elemental-chat:${DNA_VERSION}${DNA_UUID ? ':' + DNA_UUID : ''}` // default to elemental-chat:<dna version number>:<uuid> (appId format for holo self-hosted)

const WEB_CLIENT_PORT = process.env.VUE_APP_WEB_CLIENT_PORT || 8888

const WEB_CLIENT_URI =
  isHoloHosted() || isHoloSelfHosted()
    ? `wss://${window.location.hostname}/api/v1/ws/`
    : `ws://localhost:${WEB_CLIENT_PORT}`

// this dna_alias should be whatever is set in HHA
const HOLO_DNA_ALIAS = 'elemental-chat'

console.log('process.env.VUE_APP_CONTEXT : ', process.env.VUE_APP_CONTEXT)
console.log('INSTALLED_APP_ID : ', INSTALLED_APP_ID)
console.log('WEB_CLIENT_URI : ', WEB_CLIENT_URI)
console.log('HOLO_DNA_ALIAS : ', HOLO_DNA_ALIAS)

// We can't store the webSdkConnection object directly in vuex, so store this wrapper instead
function createHoloClient (webSdkConnection) {
  return {
    signUp: (...args) => webSdkConnection.signUp(...args),
    signIn: (...args) => webSdkConnection.signIn(...args),
    signOut: (...args) => webSdkConnection.signOut(...args),
    appInfo: (...args) => webSdkConnection.appInfo(...args),
    ready: (...args) => webSdkConnection.ready(...args),
    zomeCall: (...args) => webSdkConnection.zomeCall(...args)
  }
}

const callZomeHolo = (_, rootState, zomeName, fnName, payload) => {
  // TODO: should this also check conductorDisconnected?
  const state = rootState.holochain
  return state.holoClient.zomeCall(
    HOLO_DNA_ALIAS,
    zomeName,
    fnName,
    payload
  )
}

const callZomeLocal = async (
  dispatch,
  rootState,
  zomeName,
  fnName,
  payload,
  timeout
) => {
  const state = rootState.holochain

  if (state.conductorDisconnected) {
    log('callZome called when disconnected from conductor')
    return
  }
  try {
    console.log('callingZome', fnName, state.holochainClient)

    const result = await state.holochainClient.callZome(
      {
        cap: null,
        cell_id: state.appInterface.cellId,
        zome_name: zomeName,
        fn_name: fnName,
        provenance: state.agentKey,
        payload
      },
      timeout
    )
    return result
  } catch (error) {
    log('ERROR: callZome threw error', error)
    if (error === 'Error: Socket is not open') {
      return dispatch('resetConnectionState', null, { root: true })
    }
  }
}

export const callZome = isHoloHosted() ? callZomeHolo : callZomeLocal

// commit, dispatch and state here are relative to the holochain store, not the global store
let isInitializingHolo = false
const initializeClientHolo = async (commit, dispatch, state) => {
  if (isInitializingHolo) return
  isInitializingHolo = true
  let holoClient

  if (!state.holoClient) {
    const webSdkConnection = new WebSdkConnection(
      process.env.VUE_APP_CHAPERONE_SERVER_URL,
      signal => handleSignal(signal, dispatch),
      {
        logo_url: 'img/ECLogoWhiteMiddle.png',
        app_name: 'Elemental Chat',
        info_link: 'https://holo.host/faq-tag/elemental-chat'
      }
    )
    holoClient = createHoloClient(webSdkConnection)
    commit('setHoloClient', holoClient)
  } else {
    holoClient = state.holoClient
  }

  try {
    await holoClient.ready()
  } catch (e) {
    commit('setIsChaperoneDisconnected', true)
    return
  }

  if (!state.isHoloSignedIn) {
    try {
      await holoClient.signIn()
      commit('setIsHoloSignedIn', true)
    } catch (e) {
      commit('setIsChaperoneDisconnected', true)
      return
    }
  }

  isInitializingHolo = false
}

// commit, dispatch and state (unused) here are relative to the holochain store, not the global store
const initializeClientLocal = async (commit, dispatch, _) => {
  try {
    const holochainClient = await AppWebsocket.connect(WEB_CLIENT_URI, signal =>
      handleSignal(signal, dispatch))

    const appInfo = await holochainClient.appInfo({
      installed_app_id: INSTALLED_APP_ID
    })

    const cellId = appInfo.cell_data[0][0]
    const agentId = cellId[1]
    console.log('agent key : ', arrayBufferToBase64(agentId))
    commit('setAgentKey', agentId)
    commit('setAppInterface', {
      port: WEB_CLIENT_PORT,
      appId: INSTALLED_APP_ID,
      cellId,
      appVersion: APP_VERSION
    })
    commit('setHolochainClient', holochainClient)
    // TODO: remove this call to refreshChatter, and the refreshChatter action
    // dispatch('elementalChat/refreshChatter', null, { root: true })

    holochainClient.client.socket.onclose = function (e) {
      // whenever we disconnect from conductor (in dev setup - running 'holochain-run-dna'),
      // we create new keys... therefore the identity shouold not be held inbetween sessions
      commit('resetConnectionState')
      console.log(
        `Socket is closed. Reconnect will be attempted in ${RECONNECT_SECONDS} seconds.`,
        e.reason
      )
      commit('setReconnecting', RECONNECT_SECONDS)
    }
  } catch (e) {
    console.log('Connection Error ', e)
    commit('setReconnecting', RECONNECT_SECONDS)
  }
}

const initializeClient = isHoloHosted() ? initializeClientHolo : initializeClientLocal

function conductorConnected (state) {
  return state.reconnectingIn === -1
}

function conductorInBackoff (state) {
  return state.reconnectingIn > 0
}

export default {
  namespaced: true,
  state: {
    holochainClient: null,
    holoClient: null,
    isHoloSignedIn: false,
    isChaperoneDisconnected: false,
    conductorDisconnected: true,
    reconnectingIn: 0,
    appInterface: null,
    firstConnect: false
  },
  actions: {
    initialize ({ commit, dispatch, state }) {
      initializeClient(commit, dispatch, state)

      setInterval(function () {
        if (!conductorConnected(state)) {
          if (conductorInBackoff(state)) {
            commit('setReconnecting', state.reconnectingIn - 1)
          } else {
            initializeClient(commit, dispatch, state)
          }
        }
      }, 1000)
    },
    skipBackoff ({ commit }) {
      commit('setReconnecting', 0)
    },
    resetConnectionState ({ commit }) {
      commit('resetConnectionState')
    },
    async holoLogout ({ rootState, commit, dispatch }) {
      if (rootState.holoClient) {
        await rootState.holoClient.signOut()
      }
      commit('clearAgentHandle', null, { root: true })
      commit('setIsHoloSignedIn', false)
      dispatch('initializeAgent', null, { root: true })
    }
  },
  mutations: {
    // TODO: this should be called localAgentKey, because it is only relevant in the local holochain case.
    // But there might be a better way to separate those cases and insulate the rest of the app from the distinction.
    setAgentKey (state, payload) {
      state.agentKey = payload
    },
    setAppInterface (state, payload) {
      state.appInterface = payload
    },
    setReconnecting (state, payload) {
      state.firstConnect = false
      state.reconnectingIn = payload
    },
    setHolochainClient (state, payload) {
      state.holochainClient = payload
      state.conductorDisconnected = false
      state.reconnectingIn = -1
      state.firstConnect = false
    },
    setHoloClient (state, payload) {
      state.holoClient = payload
      state.conductorDisconnected = false
      state.reconnectingIn = -1
      state.firstConnect = false
    },
    setIsHoloSignedIn (state, payload) {
      state.isHoloSignedIn = payload
    },
    setIsChaperoneDisconnected (state, payload) {
      state.isChaperoneDisconnected = payload
    },
    resetConnectionState (state) {
      console.log('RESETTING CONNECTION STATE')
      state.holochainClient = null
      state.holoClient = null
      state.conductorDisconnected = true
      state.reconnectingIn = RECONNECT_SECONDS
      state.appInterface = null
    }
  }
}
