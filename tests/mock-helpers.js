/* global jest */
import { toUint8Array } from '@/utils'
import { state as hcState, actions as hcActions } from '@/store/holochain'
import elementalChatComponent, { state as chatState, actions as chatActions } from '@/store/elementalChat'
import Vuex from 'vuex'

export const DNA_VERSION_MOCK = 'uhC0kvrTHaVNrHaYMBEBbP9nQDA8xdat45mfQb9NtklMJ1ZOfqmZh'
export const DNA_HASH_MOCK = toUint8Array(Buffer.from(DNA_VERSION_MOCK, 'base64'))
export const AGENT_KEY_MOCK = toUint8Array(Buffer.from('uhCAkKCV0Uy9OtfjpcO/oQcPO6JN6TOhnOjwkamI3dNDNi+359faa', 'base64'))

/// Stubbing Element helpers :
// --------------------
export const mockAgentState = {
  needsHandle: true,
  agentHandle: ''
}

export const resetAgentState = () => {
  mockAgentState.needsHandle = true
  mockAgentState.agentHandle = ''
}

export const emptyChannel = {
  info: { name: '' },
  entry: { category: 'General', uuid: '' },
  messages: [],
  activeChatters: [],
  unseen: false
}

export const mockChatState = {
  ...chatState,
  stats: {
    agentCount: 0,
    activeCount: 0,
    channelCount: 0,
    messageCount: 0
  },
  // start with empty to mock showingAdd() behavior in channels component on first render
  channels: [emptyChannel],
  currentChannelId: null,
  statsLoading: false
}

export const resetChatState = () => {
  mockChatState.stats = {
    agentCount: 0,
    activeCount: 0,
    channelCount: 0,
    messageCount: 0
  }
  mockChatState.channels = [emptyChannel]
  mockChatState.currentChannelId = null
  mockChatState.statsLoading = false
}

export const createMockChannel = (uuid, name, agent) => ({
  info: {
    name,
    created_by: agent
  },
  entry: { category: 'General', uuid },
  messages: [],
  activeChatters: [agent],
  unseen: false
})

export const getCurrentChannel = chatState => {
  if (chatState.currentChannelId === null) return emptyChannel
  return chatState.channels.find(channel => channel.entry.uuid === chatState.currentChannelId)
}

export const mockHolochainState = {
  ...hcState,
  agentKey: AGENT_KEY_MOCK,
  dnaHash: DNA_VERSION_MOCK
}

export const resetHolochainState = () => {
  mockAgentState.agentKey = AGENT_KEY_MOCK
  mockAgentState.dnaHash = DNA_VERSION_MOCK
}

export const setStubbedStore = (agentState = mockAgentState, holochainState = mockHolochainState, chatState = mockChatState, additionalChannels = 0) => {
  const channelsList = chatState.channels
  for (let i; i <= additionalChannels; i++) {
    channelsList.push(createMockChannel(i, `Channel #${i}`, agentState.agentHandle || `test-agent-${i}`))
  }
  const stubbedActions = {
    listChannels: () => Promise.resolve(channelsList),
    ...chatActions,
    ...hcActions
  }
  return new Vuex.Store({
    actions: stubbedActions,
    state: {
      ...agentState,
      errorMessage: ''
    },
    modules: {
      elementalChat: {
        namespaced: true,
        state: chatState,
        getters: {
          channel: () => getCurrentChannel(chatState)
          // channel: elementalChatComponent.getters.channel.mockImplementation(() => getCurrentChannel(chatState))
        }
      },
      holochain: {
        namespaced: true,
        state: holochainState
      }
    }
  })
}

/// Window Mock helpers:
// --------------------
export const navigateToNextLocation = () => {
  const location = window.location.href + '/next'
  window.location.replace(location)
}

export const mockWindowReplace = jest.fn()
const mockWindowOpen = jest.fn()
// without a copy of window, a circular dependency problem occurs
const originalWindow = { ...window }
export const windowSpy = jest.spyOn(global, 'window', 'get')
export const mockWindowRedirect = (hrefLocation) => windowSpy.mockImplementation(() => ({
  ...originalWindow,
  location: {
    ...originalWindow.location,
    href: hrefLocation,
    replace: mockWindowReplace
  },
  open: mockWindowOpen
}))
