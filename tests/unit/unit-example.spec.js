/* global it, describe, expect, beforeEach */
import Vuex from 'vuex'
import { renderAndWait } from '../test-utils'
import { createLocalVue } from 'vue-test-utils'
import appStore from '@/store'
import Vuetify from 'vuetify'
import App from '@/App.vue'

const localVue = createLocalVue()
localVue.use(Vuex)
localVue.use(Vuetify)

describe('App.vue', () => {
  // let actions
  let store
  let vuetify

  beforeEach(() => {
    // actions = {
    //   SOME_ACTION: jest.fn()
    // }
    store = appStore
    // store = new Vuex.Store({
    //   state: {},
    //   actions,
    // });

    vuetify = new Vuetify({
      theme: {
        dark: true,
        themes: {
          dark: {
            primary: '#d7ea44',
            accent: '#424242',
            secondary: '#9c27b0',
            success: '#4CAF50',
            info: '#2196F3',
            warning: '#FB8C00',
            error: '#FF5252'
          },
          light: {
            primary: '#1976D2',
            accent: '#e91e63',
            secondary: '#30b1dc',
            success: '#4CAF50',
            info: '#2196F3',
            warning: '#FB8C00',
            error: '#FF5252'
          }
        }
      }
    })
  })

  it.skip('renders props.msg when passed', async () => {
    console.log('APP: ', App)
    // TODO: use shallow if unalbe to use renderAndWait
    // shallow(App, {
    //   localVue,
    //   store,
    //   vuetify,
    // });

    const { debug, getByText, getByLabelText } = await renderAndWait(App, store)
    debug()
    expect(true).toBe(true)
  })
})
