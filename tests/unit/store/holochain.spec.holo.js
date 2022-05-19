/* global jest, it, describe, expect, beforeAll, afterAll */
import { createLocalVue } from '@vue/test-utils'
import { getStubbedStore, DNA_HASH_MOCK, AGENT_KEY_MOCK } from '../../mock-helpers'
import { Connection } from '@holo-host/web-sdk'
import { isHoloHosted } from '@/utils'
import Vuex from 'vuex'
import wait from 'waait'

const MockConductor = require('@holo-host/mock-conductor')

jest.mock('@/store/callZome')
jest.genMockFromModule('@holo-host/web-sdk')
jest.mock('@holo-host/web-sdk')

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
    jest.clearAllMocks()
  })

  it('handles initalizing Holo Client', async () => {
    Connection.mockImplementation(() => ({
      ready: jest.fn((_) => Promise.resolve(true)),
      appInfo: jest.fn((_) => Promise.resolve({ cell_data: [{ cell_id: 'cellId', role_id: 'roleId' }] })),
      addListener: jest.fn(() => {})
    }))
    // mock init fn
    await stubbedStore.dispatch('holochain/initialize')
    await wait(1000)
    expect(stubbedStore.state.holochain.agentKey).toEqual(AGENT_KEY_MOCK)
    await wait(2000)
    expect(Connection.mock.calls.length).toEqual(1)
    expect(Connection.mock.instances.length).toEqual(1)
  })

  it('creates the correct in Holo Environment flag for initialize fn and zomeCalls', async () => {
    expect(process.env.VUE_APP_CONTEXT).toBe('holo-host')
    expect(isHoloHosted()).toBe(true)
  })
})
