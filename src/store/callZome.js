import { isHoloHosted, log } from '@/utils'
import { logZomeCall, actionType, UndefinedClientError, HoloError } from '@/store/utils'
import { RECONNECT_SECONDS } from '@/consts'
import wait from 'waait'

let holoErrorTimeoutId, isTimeoutSet;
let holoZomeCallErrorCount = 0
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
  else if (holoErrorTimeoutId) {
    clearTimeout(holoErrorTimeoutId)
    isTimeoutSet = false
  }
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

    if (result instanceof Error || result?.type === 'error') {
      throw new Error(result.payload.message)
    }

    if (LOG_ZOME_CALLS) {
      log(`${zomeName}.${fnName} result`, result)
    }
    return result
  } catch (e) {
    log(`${zomeName}.${fnName} ERROR: callZome threw error`, e)
    if (e.toString().includes('membrane proof') && e.toString().includes('already used')) {
      const uniqueSigningCodeFailureMsg = 'Sign-up has failed and the automatic sign-out has been triggered because the provided joining code was already used.  Please reattempt sign-up with a unique joining code or sign-in if a returning user.'
      dispatch('setErrorMessage', uniqueSigningCodeFailureMsg, { root: true })
      // wait for error message to show
      await wait(15000)
      console.error('Signed up with previously used jonining code - will sign user out after 15 seconds.')
      return await dispatch('holochain/holoLogout', null, { root: true })
    } else if (e.toString().includes('Socket is not open') || e.toString().includes('Socket not ready') || e.toString().includes('Waited for')) {
      log('Socket is not open. Resetting connection state...')
      return dispatch('holochain/resetConnectionState', null, { root: true })
    } else if (e instanceof UndefinedClientError) {
      undefinedClientCount++
      if (state.isHoloSignedIn) {
        log('holoClient should be defined but is not found.  Resetting connection state...')
        return await signalHoloDisconnect(state, dispatch)
      } else if (undefinedClientCount > 5) {
        undefinedClientCount = 0
        log('Consistently unable to connect to holoClient.  Resetting connection state...')
        return await signalHoloDisconnect(state, dispatch)
      }
    } else if (e instanceof HoloError) {
      holoZomeCallErrorCount++
      if (holoZomeCallErrorCount === 5) {
        holoZomeCallErrorCount = 0
        // create timeout for error loop at 15min
        if (!isTimeoutSet) {
          const errorTimeout = 900_000 // 15min in ms
          holoErrorTimeoutId = setTimeout(() => {
            console.error(`Could not connect to DNA via holoClient. Timed out at ${errorTimeout} ms`)
            dispatch('holochain/skipBackoff', null, { root: true })
            dispatch('holochain/resetConnectionState', null, { root: true })
          }, errorTimeout)
          isTimeoutSet = true
        }
        log('Consistently unable to make zome call via holoClient.  Signaling Holo disconnection error.')
        return dispatch('holochain/signalHoloDisconnect', null, { root: true })
      }
    }
    throw e
  } finally {
    dispatch('holochain/callIsNotLoading', fnName, { root: true })
  }
}
