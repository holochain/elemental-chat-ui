/* global it, describe, expect, beforeAll, afterAll */
import Vuetify from 'vuetify'
import Vue from 'vue'
import App from '@/App.vue'
// import store from '@/store/index'
import { within, waitFor, fireEvent, getByText } from '@testing-library/vue'
import { renderAndWaitFullSetup, handleOneWithMarkup, stubElement } from '../../test-utils'

Vue.use(Vuetify)

describe('App with real store', () => {
  it('handles agent without nickame on init', async () => {})

  it('handles agent with nickame on init', async () => {})

  it.only('Updates agent nickname and displays update in appbar', async () => {
    const agentNickname = 'Alice'
    const { getByRole, debug } = await renderAndWaitFullSetup(App)
    debug()
    expect(agentNickname).toBeInTheDocument()
    const updateNickBtn = getByRole('button', { name: /update agent handle/i })
    fireEvent.click(updateNickBtn)
    console.log('\n\n\n=============================================')
    debug()
  })
})

// ///////////////// //
// The following tests mock the store and test the following vuex and vue implementation parts :
// 1. correct actions are dispated,
// 2. correct mutations are commitd,
// 3. state is updated correctly,
// 4. getters are referenced properly
// 5. (mocked) state is the current value of the
describe('App with store stubs and mocks', () => {
  //
  it('handles disconnection', async () => {})

  it('dispatches `` action when a new agent handle submitted')
})
