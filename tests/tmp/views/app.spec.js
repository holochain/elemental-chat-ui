/* global it, describe, expect, beforeAll, afterAll */
import Vuetify from 'vuetify'
import Vue from 'vue'
import App from '@/App.vue'
// import store from '@/store/index'
import { within, waitFor, fireEvent, getByText } from '@testing-library/vue'
import { renderAndWaitFullSetup, handleOneWithMarkup, stubElement } from '../../test-utils'

Vue.use(Vuetify)

describe('App on render', () => {
  it('handles agent without nickame', async () => {})

  it('handles agent with nickame', async () => {})

  it.only('Updates agent nickname and displays update in appbar', async () => {
    const agentNickname = 'Alice'
    const { getByRole, debug } = await renderAndWaitFullSetup(App)
    debug()
    // expect(agentNickname).toBeInTheDocument()
    const updateNickBtn = getByRole('button', { name: /update agent handle/i })
    fireEvent.click(updateNickBtn)
    console.log('\n\n\n=============================================')
    debug()
  })

  it('handles disconnection', async () => {})
})
