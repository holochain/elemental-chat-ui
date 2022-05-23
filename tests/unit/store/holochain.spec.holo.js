/* global jest, it, describe, expect, beforeAll, afterAll */
import { createLocalVue } from '@vue/test-utils'
import { getStubbedStore, DNA_HASH_MOCK, AGENT_KEY_MOCK } from '../../mock-helpers'
import { isHoloHosted } from '@/utils'
import Vuex from 'vuex'
import wait from 'waait'

const MockConductor = require('@holo-host/mock-conductor')

jest.mock('@/store/callZome')

const MOCK_CELL_ID = [DNA_HASH_MOCK, AGENT_KEY_MOCK]
const MOCK_APP_INFO = {
  cell_data: [{
    cell_id: MOCK_CELL_ID,
    role_id: 'elemental-chat'
  }]
}
const mockHoloClient = {
  on: () => {},
  appInfo: () => MOCK_APP_INFO,
  agent: {
    id: 'uhC0kyTmmWcm-ap9mwfGCqAf2QFK80IuUJqSzWh8TKNyDNU9tXkdx',
    isAnonymous: false
  },
  happId: 'mock-happ-id'
}
jest.mock('@holo-host/web-sdk', () => ({
  connect: () => mockHoloClient
}))

describe('holochain store in holo env', () => {
  let stubbedStore, appConductor

  beforeAll(async () => {
    appConductor = new MockConductor(9999, 8888)
    createLocalVue().use(Vuex)
    stubbedStore = getStubbedStore()
    appConductor.any(MOCK_APP_INFO)
  })

  afterAll(async () => {
    await appConductor.close()
    jest.clearAllMocks()
  })

  it('handles initalizing Holo Client', async () => {
    // mock init fn
    await stubbedStore.dispatch('holochain/initialize')
    await wait(1000)
    expect(stubbedStore.state.holochain.holo.agent.isAnonymous).toEqual(false)
    expect(stubbedStore.state.holochain.happId).toEqual(mockHoloClient.happId)
  })

  it('creates the correct in Holo Environment flag for initialize fn and zomeCalls', async () => {
    expect(process.env.VUE_APP_CONTEXT).toBe('holo-host')
    expect(isHoloHosted()).toBe(true)
  })
})
