import { isHoloHosted, log } from '@/utils'
import { logZomeCall, actionType, UndefinedClientError, HoloError } from '@/store/utils'
import { RECONNECT_SECONDS } from '@/consts'
import wait from 'waait'

let undefinedClientCount = 0
const signalHoloDisconnect = async (state, dispatch) => {
  dispatch('holochain/resetConnectionState', null, { root: true })
  // give time for reconnect (convert to ms)
  await wait(RECONNECT_SECONDS * 1000)
  if (!state.holoClient) {
    dispatch('holochain/signalHoloDisconnect', null, { root: true })
  }
}

const callZomeHolo = (_, state, zomeName, fnName, payload) => {
  if (!state.holoClient) throw new UndefinedClientError('Attempted callZomeHolo before holoClient is defined')
  else if (!state.dnaAlias) throw new HoloError('Attempted callZomeHolo before dnaAlias is defined')
  return state.holoClient.zomeCall(
    state.dnaAlias,
    zomeName,
    fnName,
    payload)
}

const callZomeLocal = async (_, state, zomeName, fnName, payload, timeout) => {
  if (!state.holochainClient) throw new UndefinedClientError('Attempted callZomeLocal before holochainClient is defined')
  return state.holochainClient.callZome({
    cap: null,
    cell_id: state.appInterface.cellId,
    zome_name: zomeName,
    fn_name: fnName,
    provenance: state.agentKey,
    payload
  },
  timeout)
}

const LOG_ZOME_CALLS = (typeof process.env.VUE_APP_LOG_ZOME_CALLS === 'string')
  ? process.env.VUE_APP_LOG_ZOME_CALLS.toLowerCase() === 'true'
  : true

export const callZome = async (dispatch, rootState, zomeName, fnName, payload, timeout) => {
  if (LOG_ZOME_CALLS) {
    log(`${zomeName}.${fnName} payload`, payload)
  }

  const state = rootState.holochain

  if (state.conductorDisconnected) {
    log('callZome called when disconnected from conductor')
    return
  }

  dispatch('holochain/callIsLoading', fnName, { root: true })

  try {
    // Note: Do not remove this log. See /store/utils fore more info.
    logZomeCall(zomeName, fnName, actionType.START)
    const result = isHoloHosted()
      ? await callZomeHolo(dispatch, state, zomeName, fnName, payload, timeout)
      : await callZomeLocal(dispatch, state, zomeName, fnName, payload, timeout)

    // Note: Do not remove this log. See /store/utils fore more info.
    logZomeCall(zomeName, fnName, actionType.DONE)

    if (result?.type === 'error') {
      throw new Error(result.payload.message)
    }

    if (LOG_ZOME_CALLS) {
      log(`${zomeName}.${fnName} result`, result)
    }
    return result
  } catch (e) {
    log(`${zomeName}.${fnName} ERROR: callZome threw error`, e)
    if (e.toString().includes('Socket is not open')) {
      log('Socket is not open. Resetting connection state...')
      return dispatch('holochain/resetConnectionState', null, { root: true })
    }
    if (e instanceof UndefinedClientError) {
      undefinedClientCount++
      if (state.isHoloSignedIn) {
        log('holoClient should be defined but is not found.  Resetting connection state...')
        return await signalHoloDisconnect(state, dispatch)
      } else if (undefinedClientCount > 5) {
        undefinedClientCount = 0
        log('Consistently unable to connect to holoClient.  Resetting connection state...')
        return await signalHoloDisconnect(state, dispatch)
      }
      throw e
    }
  } finally {
    dispatch('holochain/callIsNotLoading', fnName, { root: true })
  }
}
