/* global jest */
import { toUint8Array } from '@/utils'
import holochainStore from '@/store/holochain'
import elementalChatStore from '@/store/elementalChat'
import { storeRaw } from '@/store'
import { v4 as uuidv4 } from 'uuid'
import Vuex from 'vuex'

const { state: hcState, actions: hcActions, mutations: hcMutations } = holochainStore
const { state: chatState, actions: chatActions, mutations: chatMutations } = elementalChatStore

export const DNA_VERSION_MOCK = 'uhC0kvrTHaVNrHaYMBEBbP9nQDA8xdat45mfQb9NtklMJ1ZOfqmZh'
export const DNA_HASH_MOCK = toUint8Array(Buffer.from(DNA_VERSION_MOCK, 'base64'))
export const AGENT_KEY_MOCK = toUint8Array(Buffer.from('uhCAkKCV0Uy9OtfjpcO/oQcPO6JN6TOhnOjwkamI3dNDNi+359faa', 'base64'))

export const timestampToSemanticDate = (timestamp) => {
  return `${new Date(timestamp[0] * 1000)}`
}

/// Stubbing Element helpers :
// --------------------
// create message for api - input into dna
export const createNewMessage = (content, agent = AGENT_KEY_MOCK, uuid = uuidv4()) => ({
  createdBy: agent,
  entry: { content, uuid },
  messages: [],
  createdAt: [0, 0]
})

// create message mocking full obj - after dna
export const createMockMessage = (content, agent = AGENT_KEY_MOCK, uuid = uuidv4(), timestamp = [0, 0]) => ({
  entry: {
    uuid,
    content // "agent: testing message"
  },
  entryHash: Buffer.from('entry hash'),
  createdBy: agent,
  createdAt: timestamp
})

// create channel for api - input into dna
export const createNewChannel = (name, agent = AGENT_KEY_MOCK, uuid = uuidv4(), latestChunk = 0) => ({
  info: {
    name,
    created_by: agent
  },
  entry: { category: 'General', uuid },
  messages: [],
  last_seen: {},
  // adding activeChatters as well, as this is added in the getters, which is not accessed when testing store unit tests
  activeChatters: [],
  latestChunk
})

// create channel mocking full object - after  dna
export const createMockChannel = (name, agent = AGENT_KEY_MOCK, uuid = uuidv4(), unseen = false) => ({
  info: {
    name,
    created_by: agent
  },
  entry: { category: 'General', uuid },
  messages: [],
  activeChatters: [agent],
  unseen,
  latestChunk: 0
})

export const getCurrentChannel = chatState => {
  if (chatState.currentChannelId === null) return emptyChannel
  return chatState.channels.find(channel => channel.entry.uuid === chatState.currentChannelId)
}

export const getCurrentChannelMsgTotal = chatState => {
  if (chatState.currentChannelId === null) throw new Error('no channel id provided when getting message total')
  const channel = chatState.channels.find(channel => channel.entry.uuid === chatState.currentChannelId)
  return channel.totalMessageCount
}

export const emptyChannel = {
  info: { name: '' },
  entry: { category: 'General', uuid: '' },
  messages: [],
  activeChatters: [],
  unseen: false,
  latestChunk: 0
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
  statsLoading: false,
  agentKey: AGENT_KEY_MOCK,
  dnaHash: DNA_VERSION_MOCK
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

export const mockHolochainState = {
  ...hcState,
  agentKey: AGENT_KEY_MOCK,
  dnaHash: DNA_VERSION_MOCK
}

export const resetHolochainState = () => {
  mockAgentState.agentKey = AGENT_KEY_MOCK
  mockAgentState.dnaHash = DNA_VERSION_MOCK
}

export const mockAgentState = {
  needsHandle: true,
  agentHandle: ''
}

export const resetAgentState = () => {
  mockAgentState.needsHandle = true
  mockAgentState.agentHandle = ''
}

export let stubbedActions = {}
export const getStubbedActions = (actionStubs = {}) => {
  const actions = {
    chat: { ...actionStubs.chat, ...chatActions },
    holochain: { ...actionStubs.holochain, ...hcActions },
    index: { ...actionStubs.index, ...storeRaw.actions }
  }
  stubbedActions = { ...actions, ...stubbedActions }
  return stubbedActions
}

export let stubbedMutations = {}
export const getStubbedMutations = (mutationStubs = {}) => {
  const mutations = {
    chat: { ...mutationStubs.chat, ...chatMutations },
    holochain: { ...mutationStubs.holochain, ...hcMutations },
    index: { ...mutationStubs.index, ...storeRaw.mutations }
  }
  stubbedMutations = { ...mutations, ...stubbedMutations }
  return stubbedMutations
}

export const getStubbedStore = (agentState = mockAgentState, holochainState = mockHolochainState, chatState = mockChatState, actions = stubbedActions, mutations = stubbedMutations, opts = {}) => {
  const { callLoading, additionalChannels } = opts
  if (JSON.stringify(actions) === '{}') {
    actions = getStubbedActions()
  }
  if (JSON.stringify(mutations) === '{}') {
    mutations = getStubbedMutations()
  }
  const channelsList = chatState.channels
  if (additionalChannels) {
    for (let i; i <= additionalChannels; i++) {
      channelsList.push(createMockChannel(`Channel #${i}`, agentState.agentHandle || `test-agent-${i}`, i))
    }
  }
  return new Vuex.Store({
    actions: { ...actions.index },
    mutations: { ...mutations.index },
    state: {
      ...agentState,
      errorMessage: ''
    },
    modules: {
      elementalChat: {
        namespaced: true,
        state: chatState,
        actions: { ...actions.chat, listChannels: () => Promise.resolve(channelsList), listAllMessages: () => Promise.resolve(channelsList.map(channel => ({ channel, messages: channel.messages })))  },
        mutations: { ...mutations.chat },
        getters: {
          createMessageLoading: () => (callLoading || false),
          channel: () => getCurrentChannel(chatState),
          totalMessageCount: () => getCurrentChannelMsgTotal(chatState)
        }
      },
      holochain: {
        namespaced: true,
        state: holochainState,
        actions: { ...actions.holochain },
        mutations: { ...mutations.holochain }
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
