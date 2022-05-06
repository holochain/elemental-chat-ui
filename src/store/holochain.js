import { AppWebsocket } from '@holochain/conductor-api'
import WebSdk from '@holo-host/web-sdk'
import { isHoloHosted, log } from '@/utils'
import { RECONNECT_SECONDS, INSTALLED_APP_ID, WEB_CLIENT_URI } from '@/consts'
import { handleSignal } from './elementalChat'
import { inspect } from 'util'
import { isAnonymousEnabled } from '../utils'

let client

window.WebSdk = WebSdk

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
    console.log('------> initializeClientLocal');
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

export default {
  namespaced: true,

  state: {
    hasClient: false,
    agent: {},
    happId: null,
    roleId: null,
    holochainClient: null,
    holoClient: null,
    // empty, connecting_to_host, failed_to_load_chaperone, holo_initialized, loading_info, ready
    holoStatus: 'empty',
    isHoloAnonymous: null,
    conductorDisconnected: true,
    reconnectingIn: 0,
    dnaHash: null,
    agentKey: null,
    dnaAlias: null,
    isLoading: {},
    hostUrl: ''
  },

  actions: {
    async initialize ({ commit, dispatch, state }) {
      if (isHoloHosted()) {
        commit('connectingHolo')

        try {
          client = await WebSdk.connect({
            chaperoneUrl: process.env.VUE_APP_CHAPERONE_SERVER_URL,
            authFormCustomization: {
              anonymousAllowed: true,
              publisherName: 'Holo',
              appName: 'Elemental Chat',
              logoUrl: 'img/ECLogoWhiteMiddle.png',
              infoLink: 'https://holo.host/faq-tag/elemental-chat',
              // membraneProofServer: {
              //   url: 'https://holo-registration-service.holo.host',
              //   payload: {
              //     role: 'holofuel'
              //   }
              // },
              skipRegistration: true
            }
          })
        } catch (e) {
          console.log('Elemental Chat UI: WebSdkApi.connect threw', e.message)
          return
        }

        commit('setHasClient', true)

        commit('setAgent', client.agent)
        commit('setHappId', client.happId)

        client.on('agent-state', agentState => {
          console.log('Agent state:', agentState);
          commit('setAgent', agentState)

          if (agentState.unrecoverableError) {
            dispatch('handleUnrecoverableAgentState', agentState.unrecoverableError)
          }

          if (agentState.isAvailable) {
            dispatch('getHoloAppInfo')
            commit('setHolochainClient', client)

          }
        })

        client.on('signal', payload => dispatch('handleSignal', payload))

        // commit('createHoloClient', client)

        console.log('--> Connected via webSDK client:', client)
        // state.holoClient.ready().catch(e => {
        //   console.error('Failed to load chaperone:', e)
        //   commit('failedToLoadChaperone')
        // })
      } else {
        initializeClientLocal(commit, dispatch, state)
      }
    },

    async signIn ({ commit }) {
      console.log('--------> SIGNIN!');
      await client.signIn()
      commit('holoInitialized', { anonymous: false })
    },

    async signInUncancellable () {
      await client.signIn({ cancellable: false })
    },

    async signUp ({ commit }) {
      console.log('--------> SIGNUP!');
      await client.signUp()
      commit('holoInitialized', { anonymous: false })
    },

    async signOut ({ commit }) {
      await client.signOut()
      commit('disconnectedFromHost')
    },

    handleSignal (_, signal) {
      console.log('Elemental chat UI: Got Signal', signal)
    },

    async zomeCall ({ state }, args) {
      console.log('DUMMY UI ZOME CALL args', args)
      const { zomeName, fnName, payload } = args
      const result = await client.zomeCall({
        roleId: state.roleId,
        zomeName,
        fnName,
        payload
      })

      // result may be of form { type: 'ok', data: ... } or { type 'error', data: ... }, we're letting the caller deal with that
      return result
    },

    getAppInfo () {
      return client.appInfo()
    },

    cellData () {
      return client.cellData
    },

    happId () {
      return client.happId
    },
    async agentInfoHappId () {
      return {
        agent: client.agent,
        happId: client.agentInfo
      }
    },
    handleUnrecoverableAgentState (_, error) {
      // handle this error in the ui
      console.error('Unrecoverable Agent State', error)
    },

    async getHoloAppInfo ({ commit, dispatch }) {
      console.log('--------> getHoloAppInfo');
      commit('loadingAppInfo')
      const appInfo = await dispatch('getAppInfo')

      commit('setAppInfo', appInfo)

      const {
        cell_data: [
          {
            role_id
          }
        ]
      } = appInfo

      commit('setRoleId', role_id)
    },





    skipBackoff ({ commit }) {
      commit('setReconnecting', 0)
    },

    resetHolochainConnectionState ({ commit }) {
      commit('resetHolochainConnectionState')
    },

    async loadHostInfo ({ commit, state }) {
      const { url } = await state.holoClient.holoInfo()
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

    async holoSignin ({ state }) {
      if (state.isHoloAnonymous !== true) {
        throw new Error(
          `cannot log in without being anonymous (isHoloAnonymous === ${state.isHoloAnonymous})`
        )
      }
      await state.holoClient.signIn({ cancellable: isAnonymousEnabled() })
    },

    async holoSignup ({ state }) {
      if (state.isHoloAnonymous !== true) {
        throw new Error(
          `cannot log in without being anonymous (isHoloAnonymous === ${state.isHoloAnonymous})`
        )
      }
      await state.holoClient.signUp({ cancellable: isAnonymousEnabled() })
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

    holoInitialized (state, { anonymous }) {
      if (state.holoStatus === 'connecting_to_host') {
        state.holoStatus = 'holo_initialized'
        log(`holo initialized; setting holoStatus = ${state.holoStatus}`)
      }
      // Prevent going from false -> true since that transition is reverved for holoLogout.
      if (!(state.isHoloAnonymous === false && anonymous === true)) {
        state.isHoloAnonymous = anonymous
        log(`setting isHoloAnonymous = ${state.isHoloAnonymous}`)
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

    loadingAppInfo (state) {
      if (!state.agent.isAvailable) {
        throw new Error(`loadingAppInfo: unexpected state ${state.holoStatus}`)
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
            role_id
          }
        ]
      } = appInfo

      state.dnaAlias = role_id
      log(`dnaAlias = ${state.dnaAlias}`)
      state.dnaHash = Buffer.from(dnaHash)
      log(`dnaHash = ${state.dnaHash.toString('base64')}`)
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
      console.log(payload);
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
    },

    setHasClient (state, hasClient) {
      state.hasClient = hasClient
    },

    setAgent (state, agent) {
      state.agent = agent
    },

    setHappId (state, happId) {
      state.happId = happId
    },

    setRoleId (state, roleId) {
      state.roleId = roleId
    }
  }
}
