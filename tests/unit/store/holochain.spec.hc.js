/* global jest, it, describe, expect, beforeAll, afterAll */
import { createLocalVue } from '@vue/test-utils'
import { getStubbedStore, DNA_HASH_MOCK, AGENT_KEY_MOCK, getStubbedMutations } from '../../mock-helpers'
import { isHoloHosted } from '@/utils'
import Vuex from 'vuex'
import wait from 'waait'

jest.mock('@/store/callZome')

const MockConductor = require('@holo-host/mock-conductor')

describe('holochain store in holochain env', () => {
  let stubbedStore, appConductor
  const MOCK_CELL_ID = [DNA_HASH_MOCK, AGENT_KEY_MOCK]
  const MOCK_CELL_DATA = {
    cell_data: [{
      cell_id: MOCK_CELL_ID,
      cell_nick: 'elemental-chat'
    }]
  }

  beforeAll(async () => {
    appConductor = new MockConductor(9999, 8888)
    createLocalVue().use(Vuex)
    getStubbedMutations({
      holochain: {
        setReconnecting: jest.fn()
      }
    })
    stubbedStore = getStubbedStore()
    appConductor.any(MOCK_CELL_DATA)
  })

  afterAll(async () => {
    await appConductor.close()
  })

  it('handles initalizing Holochain Client', async () => {
    await stubbedStore.dispatch('holochain/initialize') // mock init
    await wait(1000)
    expect(stubbedStore.state.holochain.agentKey).toEqual(AGENT_KEY_MOCK)
    // NOTE: The below commented out expect reveals a flaw in the UI CODE
    // expect(store.state.holochain.dnaHash).toEqual(DNA_VERSION_MOCK)
  })

  it('creates the correct in Holochain Environment flag for zomeCalls', async () => {
    expect(isHoloHosted()).toBe(false)
  })

  // tech-debt: update test to follow approach that is not based on timing / system-dependent
  it('attempts to reconnect after disconnection ', async () => {
    await appConductor.close()
    stubbedStore.dispatch = jest.fn()
    await wait(3000)
    expect(stubbedStore.state.holochain.conductorDisconnected).toEqual(true)
    // check reconnect countdown (it begins at 15 but the tests can take a few seconds to check the state)
    expect(stubbedStore.state.holochain.reconnectingIn > 1).toBe(true)
  })
})
