import { AppWebsocket } from '@holochain/conductor-api'
import WebSdk from '@holo-host/web-sdk'
import { isHoloHosted, log } from '@/utils'
import { RECONNECT_SECONDS, INSTALLED_APP_ID, WEB_CLIENT_URI } from '@/consts'
import { handleSignal } from './elementalChat'
import { inspect } from 'util'
import { isAnonymousEnabled } from '../utils'

global.window.WebSdk = WebSdk
export let holoClient;

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

    holochainClient.client.socket.onclose = function (e) {
      // TODO: decide if we would like to remove this clause:
      // whenever we disconnect from conductor (in dev setup - running 'holochain-conductor-api'),
      // we create new keys... therefore the identity should not be held in-between sessions
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

export default {
  namespaced: true,

  state: {
    holochainClient: null,
    holo: {
      hasClient: false,
      status: "empty", // empty, connecting_to_host, failed_to_load_chaperone, holo_initialized, loading_info, ready
      agent: {
        hostUrl: "",
        isAnonymous: true,
        isAvailable: false,
        unrecoverableError: false,
      },
    },
    happId: null,
    agentKey: null,
    roleId: null, 
    dnaHash: null,
    conductorDisconnected: true,
    reconnectingIn: 0,
    isLoading: {},
  },

  actions: {
    async initialize ({ commit, dispatch, state }) {
      if (isHoloHosted()) {
        if (state.holo.hasClient) {
          throw new Error(
            `initialize holo-hosting env: unexpected pre-existing holo.client ${inspect(
              holoClient
            )}`
          )
        }

        commit('connectingHolo')

        try {
          holoClient = await WebSdk.connect({
            chaperoneUrl: process.env.VUE_APP_CHAPERONE_SERVER_URL,
            authFormCustomization: {
              anonymousAllowed: true,
              publisherName: 'Holo',
              appName: 'Elemental Chat',
              logoUrl: 'img/ECLogoWhiteMiddle.png',
              infoLink: 'https://holo.host/faq-tag/elemental-chat',
              skipRegistration: true
            }
          })
          console.log('Connected to WebSDK', holoClient)
        } catch (e) {
          console.error('Elemental Chat UI: Failed to connect to Chaperone from WebSDK:', e)
          commit('failedToLoadChaperone')
          return
        }

        holoClient.on('agent-state', agentState => {
          console.log('received agent state:', agentState);
          
          if (agentState.unrecoverableError) {
            dispatch('handleUnrecoverableAgentState', agentState.unrecoverableError)
          }

          if (agentState.isAnonymous === undefined) {
            commit('holoLogout')
          }

          commit('setAgent', agentState)
        })
        
        holoClient.on('signal', payload => handleSignal(payload, dispatch))

        commit('holoInitialized', { anonymous: true })
        commit('setHasHoloClient', !!holoClient)
        commit('setHappId', holoClient.happId)
        commit('setAgent', holoClient.agent)

        try {
          await dispatch('getHoloAppInfo')
          commit('setHoloIsReady')
        } catch (e) {
          console.log('Elemental Chat UI:', e)
        }
      } else {
        initializeClientLocal(commit, dispatch, state)
      }
    },

    skipBackoff ({ commit }) {
      commit('setReconnecting', 0)
    },

    resetHolochainConnectionState ({ commit }) {
      commit('resetHolochainConnectionState')
    },

    handleUnrecoverableAgentState ({ commit }, error) {
      // TODO: Review with C/ux design re: how handle Unrecoverable Error in the ui.
      console.error('Unrecoverable Agent State', error)
      commit('holoLogout')
      commit('resetHolochainConnectionState')
    },

    async getHoloAppInfo ({ commit, state }) {
      if (state.roleId !== null) {
        state.holo.status = 'ready'
        log(
        `already loaded roleId from earlier; setting holo.status = ${state.holo.status}`
        )
      } else {
        commit('setHoloLoadingAppInfo')
        const appInfo = await holoClient.appInfo()
        commit('setAppInfo', appInfo)
      }
    },

    async holoLogout ({ commit, state }) {
      if (state.holo.agent.isAnonymous !== false) {
        throw new Error(
          `cannot log out without being logged in (isHoloAnonymous === ${state.holo.agent.isAnonymous})`
          )
        }
        commit('elementalChat/setAgentHandle', null, { root: true })
        commit('holoLogout')
        commit('disconnectedFromHost')
      await holoClient.signOut()
    },

    async holoSignin ({ commit, state }) {
      if (state.holo.agent.isAnonymous !== true) {
        throw new Error(
          `cannot log in without being anonymous (isHoloAnonymous === ${state.holo.agent.isAnonymous})`
        )
      }
      await holoClient.signIn({ cancellable: isAnonymousEnabled() })
      commit('holoInitialized', { anonymous: false})
    },

    async holoSignup ({ commit, state }) {
      if (state.holo.agent.isAnonymous !== true) {
        throw new Error(
          `cannot log in without being anonymous (isHoloAnonymous === ${state.holo.agent.isAnonymous})`
        )
      }
      await holoClient.signUp({ cancellable: isAnonymousEnabled() })
      commit('holoInitialized', { anonymous: false})
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
      if (state.holo.status !== 'empty') {
        throw new Error(`connectingHolo: unexpected state ${state.holo.status}`)
      }
      state.holo.status = 'connecting_to_host'
      log(`connecting to host; setting holo Status = ${state.holo.status}`)
    },

    disconnectedFromHost (state) {
      state.holo.status = 'connecting_to_host'
      log(`disconnected from host; setting holo Status = ${state.holo.status}. Current agent info : ${inspect(state.holo.agent)}`)
    },

    holoInitialized (state, { anonymous }) {
      if (state.holo.status === 'connecting_to_host') {
        state.holo.status = 'holo_initialized'
        log(`holo initialized; setting holo.status = ${state.holo.status}`)
      }
      // Prevent going from false -> true since that transition is reserved for holoLogout.
      if (!(state.holo.agent.isAnonymous === false && anonymous === true)) {
        state.holo.agent.isAnonymous = anonymous
        log(`setting isHoloAnonymous = ${state.holo.agent.isAnonymous}`)
      }
    },

    failedToLoadChaperone (state) {
      if (state.holo.status !== 'connecting_to_host') {
        throw new Error(
          `could not set state to failed_to_load_chaperone: unexpected state ${state.holo.status}`
          )
        }
      state.holo.status = 'failed_to_load_chaperone'
      log(`failed to load chaperone; setting holo.status = ${state.holo.status}`)
    },

    setHoloLoadingAppInfo (state) {
      if (state.holo.status !== 'holo_initialized') {
        throw new Error(`setHoloLoadingAppInfo: unexpected state ${state.holo.status}`)
      } else {
        state.holo.status = 'loading_info'
        log(
          `beginning to load app info; setting holo.status = ${state.holo.status}`
          )
      }
    },

    setHoloIsReady (state) {
      state.holo.status = 'ready'
      log(
        `holo is loaded; setting holo.status = ${state.holo.status}`
      )
    },

    setAppInfo (state, appInfo) {
      const {
        cell_data: [
          {
            cell_id: [dnaHash, _agentId],
            role_id
          }
        ]
      } = appInfo

      state.roleId = role_id
      log(`roleId = ${state.roleId}`)

      state.dnaHash = Buffer.from(dnaHash)
      log(`dnaHash = ${state.dnaHash.toString('base64')}`)
    },

    setReconnecting (state, payload) {
      state.reconnectingIn = payload
    },

    setHolochainClient (state, payload) {
      console.log(payload);
      state.holochainClient = payload
      state.conductorDisconnected = false
      state.reconnectingIn = -1
    },

    holoLogout (state) {
      state.agentKey = null
      state.holo.agent.isAnonymous = true
    },

    resetHolochainConnectionState (state) {
      state.holochainClient = null
      state.conductorDisconnected = true
      state.reconnectingIn = RECONNECT_SECONDS
    },

    // NB: This currently only tracks the function name. For a dna with multiple zomes the function names should be nested inside zome names
    updateIsLoading (state, { fnName, value }) {
      state.isLoading = {
        ...state.isLoading,
        [fnName]: value
      }
    },

    setHasHoloClient (state, hasHoloClient) {
      state.holo.hasClient = hasHoloClient
    },

    setAgent (state, agent) {
      if (agent.isAvailable === undefined) {
        agent.isAvailable = false
      }

      const { id, ...agentState } = agent
      state.holo.agent = { 
        pubkey_base64: id,
        ...agentState
      }
      state.agentKey = Uint8Array.from(Buffer.from(id, 'base64'))
    },

    setHappId (state, happId) {
      state.happId = happId
    }
  },
  getters: {
    isAvailable: state => state.holo.agent.isAvailable,
    isAnonymous: state => state.holo.agent.isAnonymous
  }
}
