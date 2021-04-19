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

console.log('APP_CONTEXT : ', process.env.VUE_APP_CONTEXT)
console.log('INSTALLED_APP_ID : ', INSTALLED_APP_ID)

if (process.env.VUE_APP_CHAPERONE_SERVER_URL !== undefined) {
  console.log('CHAPERONE_SERVER_URL', process.env.VUE_APP_CHAPERONE_SERVER_URL)
}

if (WEB_CLIENT_URI !== undefined) {
  console.log('WEB_CLIENT_URI : ', WEB_CLIENT_URI)
}

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
    window.webSdkConnection = webSdkConnection
    holoClient = createHoloClient(webSdkConnection)
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
    const appInfo = await holoClient.appInfo()
    const [cell] = appInfo.cell_data
    const { cell_id: cellId, cell_nick: dnaAlias } = cell

    commit('setHoloClientAndDnaAlias', { holoClient, dnaAlias })
    const [dnaHash, agentId] = cellId
    commit('setDnaHash', 'u' + Buffer.from(dnaHash).toString('base64'))

    console.log('setting signed in agent key', Buffer.from(agentId).toString('base64'))
    commit('setAgentKey', Buffer.from(agentId))

    const { url } = await holoClient.holoInfo()
    commit('setHostUrl', url)
  }

  isInitializingHolo = false
  dispatch('elementalChat/refreshChatter', null, { root: true })
}

// commit, dispatch and state (unused) here are relative to the holochain store, not the global store
const initializeClientLocal = async (commit, dispatch, _) => {
  try {
    const holochainClient = await AppWebsocket.connect(WEB_CLIENT_URI, 20000, signal =>
      handleSignal(signal, dispatch))
    const appInfo = await holochainClient.appInfo({
      installed_app_id: INSTALLED_APP_ID
    })

    const cellId = appInfo.cell_data[0].cell_id
    const [_, agentId] = cellId
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
      // TODO: decide if we would like to remove this clause:
      // whenever we disconnect from conductor (in dev setup - running 'holochain-conductor-api'),
      // we create new keys... therefore the identity shouold not be held inbetween sessions
      // ^^ NOTE: this no longer true with hc cli.
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
    dnaAlias: null,
    firstConnect: false,
    isLoading: {},
    hostUrl: ''
  },
  actions: {
    initialize ({ commit, dispatch, state }) {
      commit('setFirstConnect', true)
      initializeClient(commit, dispatch, state)
      setInterval(function () {
        if (!conductorConnected(state)) {
          if (conductorInBackoff(state)) {
            commit('setReconnecting', state.reconnectingIn - 1)
          } else {
            commit('setFirstConnect', false)
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
    async holoLogout ({ dispatch, commit, state }) {
      commit('elementalChat/setAgentHandle', null, { root: true })
      commit('setIsHoloSignedIn', false)
      commit('setAgentKey', null)
      if (!state.holoClient) return

      await state.holoClient.signOut()
      commit('setIsChaperoneDisconnected', false)
      try {
        await state.holoClient.signIn()

        commit('setIsHoloSignedIn', true)

        const appInfo = await state.holoClient.appInfo()
        const [cell] = appInfo.cell_data
        let cellId
        if (Array.isArray(cell)) {
          [cellId] = cell
        } else {
          cellId = cell.cell_id
        }
        const agentId = cellId[1]

        console.log('setting signed in agent key', Buffer.from(agentId).toString('base64'))
        commit('setAgentKey', Buffer.from(agentId))

        dispatch('elementalChat/initializeAgent', null, { root: true })
      } catch (e) {
        commit('setIsChaperoneDisconnected', true)
      }
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
        ? toUint8Array(payload)
        : null
    },
    setAppInterface (state, payload) {
      state.appInterface = payload
    },
    setDnaHash (state, payload) {
      state.dnaHash = payload
    },
    setFirstConnect (state, payload) {
      state.firstConnect = payload
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
    setHoloClientAndDnaAlias (state, payload) {
      const { holoClient, dnaAlias } = payload
      console.log('HOLO DNA ALIAS : ', dnaAlias)
      state.dnaAlias = dnaAlias
      state.holoClient = holoClient
      state.reconnectingIn = -1
      state.firstConnect = false
    },
    setIsHoloSignedIn (state, payload) {
      state.isHoloSignedIn = payload
      state.conductorDisconnected = false
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
