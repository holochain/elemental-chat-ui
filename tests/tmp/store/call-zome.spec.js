/* global jest, it, describe, expect */
import callZome from '@/store/callZome'

jest.mock('@/store/callZome')

// ///////////////// //
// The following tests mock the store and test the following vuex and vue implementation parts :
// 1. correct actions are dispatched,
// 2. correct mutations are commited,
// 3. state is updated correctly,
// 4. getters are referenced properly
// 5. (mocked) state is the current value of the store

describe('callZome functionality', () => {
  it('manages loading state before and after call', async () => {})

  it('create a Holochain callZome call signature in Holochain Environment', async () => {})

  it('creates a Holo zomeCall call signature in Holo Enviornment', async () => {})
})
