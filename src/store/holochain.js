import { AppWebsocket } from '@holochain/conductor-api'
import { Connection as WebSdkConnection } from '@holo-host/web-sdk'
import { isHoloHosted, log } from '@/utils'
import {
  RECONNECT_SECONDS,
  APP_VERSION,
  INSTALLED_APP_ID,
  WEB_CLIENT_PORT,
  WEB_CLIENT_URI,
  HOLO_DNA_ALIAS
} from '@/consts'
import { arrayBufferToBase64 } from './utils'
import { handleSignal } from './elementalChat'

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
    zomeCall: (...args) => webSdkConnection.zomeCall(...args),
    holoInfo: (...args) => webSdkConnection.holoInfo(...args)
  }
}

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
    console.error(e)
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

    const { url } = await holoClient.holoInfo()
    commit('setHostUrl', url)
  }

  const appInfo = await holoClient.appInfo()
  const cellId = appInfo.cell_data[0][0]
  const agentId = cellId[1]
  console.log('agent key', arrayBufferToBase64(agentId))
  commit('setAgentKey', agentId)
  commit('setDnaHash', 'u' + Buffer.from(cellId[0]).toString('base64'))
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
    console.log('agent key', arrayBufferToBase64(agentId))
    commit('setAgentKey', agentId)
    commit('setAppInterface', {
      port: WEB_CLIENT_PORT,
      appId: INSTALLED_APP_ID,
      cellId,
      appVersion: APP_VERSION
    })

    const dnaHash = 'u' + Buffer.from(cellId[0]).toString('base64')
    console.log('dnaHash : ', dnaHash)
    commit('setDnaHash', dnaHash)

    commit('setHolochainClient', holochainClient)
    dispatch('elementalChat/refreshChatter', null, { root: true })

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
    log('Connection Error ', e)
    commit('setReconnecting', RECONNECT_SECONDS)
  }
}

const initializeClient = (commit, dispatch, state) => {
  isHoloHosted()
    ? initializeClientHolo(commit, dispatch, state)
    : initializeClientLocal(commit, dispatch, state)

  // refresh chatter state every 2 hours
  setInterval(function () {
    if (conductorConnected(state)) {
      dispatch('elementalChat/refreshChatter')
    }
  }, 1000 * 60 * 60 * 2)
}

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
    dnaHash: null,
    agentKey: null,
    firstConnect: false,
    isLoading: {},
    hostUrl: ''
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
    },
    callIsLoading ({ commit }, payload) {
      commit('updateIsLoading', { fnName: payload, value: true })
    },
    callIsNotLoading ({ commit }, payload) {
      commit('updateIsLoading', { fnName: payload, value: false })
    }
  },
  mutations: {
    setAgentKey (state, payload) {
      state.agentKey = payload
    },
    setAppInterface (state, payload) {
      state.appInterface = payload
    },
    setDnaHash (state, payload) {
      state.dnaHash = payload
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
      state.holochainClient = null
      state.holoClient = null
      state.conductorDisconnected = true
      state.reconnectingIn = RECONNECT_SECONDS
      state.appInterface = null
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
