import { isHoloHosted, log } from '@/utils'
import { HOLO_DNA_ALIAS } from '@/consts'

const callZomeHolo = (_, state, zomeName, fnName, payload) =>
  state.holoClient.zomeCall(
    HOLO_DNA_ALIAS,
    zomeName,
    fnName,
    payload)

const callZomeLocal = async (_, state, zomeName, fnName, payload, timeout) =>
  state.holochainClient.callZome({
    cap: null,
    cell_id: state.appInterface.cellId,
    zome_name: zomeName,
    fn_name: fnName,
    provenance: state.agentKey,
    payload
  },
  timeout)

const LOG_ZOME_CALLS = true

export const callZome = async (dispatch, rootState, zomeName, fnName, payload, timeout) => {
  if (LOG_ZOME_CALLS) {
    log(`${zomeName}.${fnName} zome call`, payload)
  }

  const state = rootState.holochain

  if (state.conductorDisconnected) {
    log('callZome called when disconnected from conductor')
    return
  }

  try {
    const result = isHoloHosted()
      ? await callZomeHolo(dispatch, state, zomeName, fnName, payload, timeout)
      : await callZomeLocal(dispatch, state, zomeName, fnName, payload, timeout)

    if (LOG_ZOME_CALLS) {
      log(`${zomeName}.${fnName} zome result`, result)
    }
    return result
  } catch (e) {
    log(`${zomeName}.${fnName} ERROR: callZome threw error`, e)
    if (e === 'Error: Socket is not open') {
      return dispatch('resetConnectionState', null, { root: true })
    }
  }
}
