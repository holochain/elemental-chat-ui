/* global jest, it, describe, expect, beforeAll, afterAll */
import { createLocalVue } from '@vue/test-utils'
import { getStubbedStore, DNA_HASH_MOCK, AGENT_KEY_MOCK } from '../../mock-helpers'
import { isHoloHosted } from '@/utils'
import Vuex from 'vuex'
import wait from 'waait'

jest.mock('@/store/callZome')

const MockConductor = require('@holo-host/mock-conductor')

describe('holochain store in holo env', () => {
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
    stubbedStore = getStubbedStore()
    appConductor.any(MOCK_CELL_DATA)
  })

  afterAll(async () => {
    await appConductor.close()
  })

  it('handles initalizing Holo Client', async () => {
    await stubbedStore.dispatch('holochain/initialize') // mock init
    await wait(1000)
    expect(stubbedStore.state.holochain.agentKey).toEqual(AGENT_KEY_MOCK)
    await wait(2000)
    expect(stubbedStore.state.holochain.isHoloSignedIn).toEqual(true)
  })

  it('creates the correct in Holo Environment flag for initialize fn and zomeCalls', async () => {
    expect(process.env.VUE_APP_CONTEXT).toBe('holo-host')
    expect(isHoloHosted()).toBe(true)
  })
})
