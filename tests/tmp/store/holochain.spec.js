/* global jest, it, describe, expect */
import store from '@/store/index'

jest.mock('@/store/callZome')

describe('holochain store', () => {
  it('handles initalizing Holochain Client', async () => {})

  it('recognizes first connnection', async () => {})

  it('resets connection state', async () => {})

  it('reconnects after disconnection ', async () => {
    // todo: mock holochainClient.client.socket.onclose and set default timeout wait to 5000ms
    // nb: state.reconnectingIn must be set to > 0 in order to start reconnect cycle
    // state.reconnectingIn = 0 must be true in order to the initalize to be reattempted
  })

  it('handles initalizing Holo Client', async () => {})

  it('signs out when in Holo environment', async () => {})

  it('indicates disconnection from chaperone', async () => {})
})
