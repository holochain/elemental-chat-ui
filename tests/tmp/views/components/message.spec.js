/* global jest, it, describe, expect, beforeAll, beforeEach, afterAll */
import { within, waitFor, fireEvent } from '@testing-library/vue'
import store from '@/store/index'
import { renderAndWaitFullSetup, handleOneWithMarkup, stub, stubElement } from '../../test-utils'
import { mockHolochainState, resetHolochainState, mockAgentState, resetAgentState, mockChatState as defaultChatState, resetChatState, createMockChannel, setStubbedStore, mockWindowRedirect, mockWindowReplace, navigateToNextLocation, windowSpy } from '../../mock-helpers'
import Vue from 'vue'
import Vuetify from 'vuetify'
import Message from '@/components/Message.vue'

Vue.use(Vuetify)

describe('Message with real store', () => {
  it('creates a new message', async () => {})
})

// ///////////////// //
// The following tests mock the store and test the following vuex and vue implementation parts :
// 1. correct actions are dispated,
// 2. correct mutations are commitd,
// 3. state is updated correctly,
// 4. getters are referenced properly
// 5. (mocked) state is the current value of the
describe('Channels with store stubs and mocks', () => {
  it('displays message title and content in display mode', async () => {})

  it('renders textarea when not in display mode', async () => {})

  it('displays spinner when new message api call is loading', async () => {})

  it('dispatches `createMessage` action when a new message submitted', async () => {})
})
