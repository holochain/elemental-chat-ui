/* global it, describe, expect, beforeAll, afterAll */
import { waitFor, fireEvent } from '@testing-library/vue'
import { renderAndWaitFullSetup } from '../../../test-utils'
import Vue from 'vue'
import Vuetify from 'vuetify'
// import Message from '@/components/Message.vue'

Vue.use(Vuetify)

describe('Message', () => {
  it.skip('displays message title and content in display mode', async () => {})

  it('renders textarea when not in display mode', async () => {})

  it('creates a new message', async () => {})
})
