import Vue from 'vue'
import Vuex from 'vuex'
import elementalChat from './elementalChat'
import holochain from './holochain'

Vue.use(Vuex)

export const storeRaw = {
  state: {
    agentHandle: '',
    errorMessage: ''
  },
  mutations: {
    setErrorMessage (state, message) {
      state.errorMessage = message
    }
  },
  actions: {
    async initializeStore ({ dispatch }) {
      await dispatch('holochain/initialize')
      dispatch('elementalChat/initialize')
    },
    setErrorMessage ({ commit }, payload) {
      commit('setErrorMessage', payload)
    }
  },
  modules: {
    holochain,
    elementalChat
  }
}

export default new Vuex.Store(storeRaw)
