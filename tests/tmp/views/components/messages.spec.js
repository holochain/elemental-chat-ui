/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { within, waitFor, fireEvent } from '@testing-library/vue'
import store from '@/store/index'
import { renderAndWaitFullSetup, handleOneWithMarkup, stub, stubElement } from '../../test-utils'
import { mockHolochainState, resetHolochainState, mockAgentState, resetAgentState, mockChatState as defaultChatState, resetChatState, createMockChannel, setStubbedStore, mockWindowRedirect, mockWindowReplace, navigateToNextLocation, windowSpy } from '../../mock-helpers'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Message from '@/components/Message.vue'

Vue.use(Vuetify)

describe('Messages with store stubs and mocks', () => {
  it('displays the correct number of messages', () => {
    // await store.dispatch('elementalChat/createChannel', createNewChannel(1, channelTitle))
    // console.log('IN TEST >> storedChannels() : ', storedChannels())
    // const newChannel = storedChannels()[0]
    // console.log('NEW CHANNEL : ', newChannel.last_seen, newChannel.name, newChannel.entry, newChannel.info, newChannel.messages, newChannel.unseen)

    // Follow up on ID and make see if/how it impact ordering... (order should be alphabetical for channels)
    // expect(wrapper.findAllComponents(Child).length).toBe(3)
  })
})
