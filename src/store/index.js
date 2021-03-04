import Vue from 'vue'
import Vuex from 'vuex'
import elementalChat from './elementalChat'
import holochain from './holochain'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    needsHandle: false,
    agentHandle: '',
    errorMessage: ''
  },
  mutations: {
    editHandle: async ({ rootState }) => {
      rootState.needsHandle = true
    },
    needsHandle (state, payload) {
      state.needsHandle = payload
    },
    setAgentHandle (state, payload) {
      state.agentHandle = payload
      window.localStorage.setItem('agentHandle', payload)
      state.needsHandle = false
    },
    clearAgentHandle (state) {
      state.agentHandle = ''
      window.localStorage.removeItem('agentHandle')
      state.needsHandle = true
    },
    setErrorMessage (state, message) {
      state.errorMessage = message
    }
  },
  actions: {
    initializeStore ({ dispatch }) {
      dispatch('initializeAgent')
      dispatch('holochain/initialize')
      dispatch('elementalChat/initialize')
    },
    initializeAgent ({ commit }) {
      const storedAgentHandle = window.localStorage.getItem('agentHandle')
      if (storedAgentHandle) {
        commit('setAgentHandle', storedAgentHandle)
        commit('needsHandle', false)
      } else {
        commit('needsHandle', true)
      }
    }
  },
  modules: {
    holochain,
    elementalChat
  }
})
