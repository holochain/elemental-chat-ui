import { isHoloHosted, log } from '@/utils'
import { logZomeCall, actionType, UndefinedClientError } from '@/store/utils'
import wait from 'waait'
import { holoClient } from '@/store/holochain'

const callZomeHolo = (_, state, zomeName, fnName, payload) => {
  return holoClient.zomeCall({
    roleId: state.roleId,
    zomeName,
    fnName,
    payload
  })
}

const callZomeLocal = async (_, state, zomeName, fnName, payload, timeout) => {
  if (!state.holochainClient) {
    throw new UndefinedClientError(
      'Attempted callZomeLocal before holochainClient is defined'
    )
  }

  return state.holochainClient.callZome(
    {
      cap: null,
      cell_id: [state.dnaHash, state.agentKey],
      zome_name: zomeName,
      fn_name: fnName,
      provenance: state.agentKey,
      payload
    },
    timeout
  )
}

const LOG_ZOME_CALLS =
  typeof process.env.VUE_APP_LOG_ZOME_CALLS === 'string'
    ? process.env.VUE_APP_LOG_ZOME_CALLS.toLowerCase() === 'true'
    : true

export const callZome = async (
  dispatch,
  rootState,
  zomeName,
  fnName,
  payload,
  timeout
) => {
  if (LOG_ZOME_CALLS) {
    log(`${zomeName}.${fnName} payload`, payload)
  }

  const state = rootState.holochain

  if (isHoloHosted()) {
    console.log('state.holo.status', state.holo.status)
    if (state.holo.status !== 'ready')  {
      log(`callZome called on holo.client before status was ready. Current status = (${state.holo.status})`)
      throw new Error('Called holoClient.callZome before client was ready for traffic.')
    }
  } else {
    if (state.conductorDisconnected) {
      log('callZome called when disconnected from conductor')
      throw new Error('Called callZome when disconnected from conductor.')
    }
  }

  dispatch('holochain/callIsLoading', fnName, { root: true })

  try {
    // Note: Do not remove this log. See /store/utils fore more info.
    logZomeCall(zomeName, fnName, actionType.START)
    const { type, data } = isHoloHosted()
      ? await callZomeHolo(dispatch, state, zomeName, fnName, payload, timeout)
      : await callZomeLocal(dispatch, state, zomeName, fnName, payload, timeout)

    // Note: Do not remove this log. See /store/utils fore more info.
    logZomeCall(zomeName, fnName, actionType.DONE)

    if (type !== 'ok' || data instanceof Error || data?.type === 'error') {
      throw new Error(data.payload.message)
    }

    if (LOG_ZOME_CALLS) {
      log(`${zomeName}.${fnName} data`, data)
    }

    return data
  } catch (e) {
    log(`${zomeName}.${fnName} ERROR: callZome threw error`, e)
    if (
      e.toString().includes('membrane proof') &&
      e.toString().includes('already used')
    ) {
      const uniqueSigningCodeFailureMsg =
        'Sign-up has failed and the automatic sign-out has been triggered because the provided joining code was already used.  Please reattempt sign-up with a unique joining code or sign-in if a returning user.'
      dispatch('setErrorMessage', uniqueSigningCodeFailureMsg, { root: true })
      // wait for error message to show
      await wait(15000)
      console.error(
        'Signed up with previously used jonining code - will sign user out after 15 seconds.'
      )
      return await dispatch('holochain/holoLogout', null, { root: true })
    } else if (
      e.toString().includes('Socket is not open') ||
      e.toString().includes('Socket not ready') ||
      e.toString().includes('Waited for')
    ) {
      log('Socket is not open. Resetting connection state...')
      return dispatch('holochain/resetConnectionState', null, { root: true })
    }
    throw e
  } finally {
    dispatch('holochain/callIsNotLoading', fnName, { root: true })
  }
}
