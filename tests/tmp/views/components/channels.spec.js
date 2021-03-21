/* global it, describe, expect, beforeAll, afterAll */
import { within, waitFor, fireEvent, getByText } from '@testing-library/vue'
import { renderAndWaitFullSetup, handleOneWithMarkup, mountElement, stubElement, mockElement } from '../../test-utils'
import { mockWindowRedirect, mockWindowReplace, navigateToNextLocation, windowSpy } from '../../mock-helpers'
import { state as chatState, actions as chatActions } from '@/store/elementalChat'
import { state as hcState, actions as hcActions } from '@/store/holochain'
import Vuetify from 'vuetify'
import Vue from 'vue'
import Channels from '@/components/Channels.vue'

Vue.use(Vuetify)

describe('Channels', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  let channelTitle = 'An amazing new channel'
  let channelId = 0

  const defaultAgentState = {
    needsHandle: false,
    agentHandle: 'Alice'
  }

  const emptyChannel = {
    info: { name: '' },
    entry: { category: 'General', uuid: '' },
    messages: [],
    activeChatters: [],
    unseen: false
  }

  const emptyMockChatState = {
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

  const mockChannel = (uuid, name, agent) => ({
    info: {
      name,
      created_by: agent
    },
    entry: { category: 'General', uuid },
    messages: [],
    activeChatters: [agent],
    unseen: false
  })

  const createNewChannel = (uuid, name) => ({
    info: {
      name,
      created_by: ''
    },
    entry: { category: 'General', uuid },
    messages: [],
    last_seen: {}
  })

  const getCurrentChannel = chatState => chatState.channels.find(channel => channel.entry.uuid === chatState.currentChannelId)

  const setStubbedStore = (agentState = defaultAgentState, chatState = emptyMockChatState, additionalChannels = 0) => {
    const channelsList = chatState.channels
    for (let i; i <= additionalChannels; i++) {
      channelsList.push(mockChannel(i, `Channel #${i}`, agentState.agentHandle || ''))
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
          }
        },
        holochain: {
          namespaced: true,
          state: hcState
        }
      }
    })
  }

  it.only('dispatches `createChannel` action when a new channel submitted', async () => {
    // Follow up on ID and make see if/how it impact ordering... (order should be alphabetical for channels)
    channelId = 10
    channelTitle = 'An amazing new channel'

    const mockChatState = {
      ...emptyMockChatState,
      stats: {
        agentCount: 1,
        activeCount: 1,
        channelCount: 0,
        messageCount: 0
      },
      channels: [mockChannel(channelId, channelTitle, defaultAgentState.agentHandle)],
      currentChannelId: channelId
    }

    const stubbedStore = setStubbedStore(null, mockChatState)
    const wrapper = stubElement(Channels, stubbedStore)

    expect(wrapper.is(Channels)).toBe(true)
    await wrapper.find('#channel-name').setValue(channelTitle)
    // await wrapper.trigger('keydown.enter')
    // await wrapper.vm.$nextTick()
    // expect(stubbedActions.mockChannel.mock.calls).toHaveLength(1)
    // expect(stubbedActions.mockChannel.mock.calls[0][1]).toEqual(mockChatState.channels[0])
  })
})

// await store.dispatch('elementalChat/createChannel', createNewChannel(1, channelTitle))
// console.log('IN TEST >> storedChannels() : ', storedChannels())
// const newChannel = storedChannels()[0]
// console.log('NEW CHANNEL : ', newChannel.last_seen, newChannel.name, newChannel.entry, newChannel.info, newChannel.messages, newChannel.unseen)

