import { v4 as uuidv4 } from 'uuid'
import { remove, uniqBy } from 'lodash'
import { toUint8Array, log } from '@/utils'
import { arrayBufferToBase64, retryIfSourceChainHeadMoved } from './utils'
import { callZome } from './callZome'

function sortChannels(val) {
  val.sort((a, b) => (a.info.name > b.info.name ? 1 : -1))
  return val
}

function getLastMessageId (channel) {
  const lastMessage = channel.messages.length > 0
  ? channel.messages[channel.messages.length - 1]
  : null

  const lastMessageId = lastMessage
    ? lastMessage.entry.uuid
    : null

  return lastMessageId
}

function storeLastMessageId(channelId, lastMessageId) {
  const storedChannels = JSON.parse(window.localStorage.getItem('channels') || '{}')
  window.localStorage.setItem('channels', JSON.stringify({
    ...storedChannels,
    [channelId]: {
      ...storedChannels[channelId], // currently empty, but leaving it this way for if we want to store more meta data per channel
      lastMessageId
    }
  }))
}

function getStoredChannel(id) {
  const channels = JSON.parse(window.localStorage.getItem('channels') || '{}')
  if (channels[id]) {
    return channels[id]
  } else {
    return {
      lastMessageId: null
    }
  }
}

export const handleSignal = (signal, dispatch) => {
  console.log('Elemental chat UI: Got Signal', signal)

  const { signal_name: signalName, signal_payload: signalPayload } = signal.data

  log(`signal received: ${signalName}`, signalPayload)

  switch (signalName) {
    case 'Message':
      // even though this is defined in the elementalChat store module, it still needs to be called with full namespace because it's actually called
      // in the context of the holochain store module (hence the export).
      dispatch('elementalChat/handleMessageSignal', signalPayload, { root: true })
      break
    default:
      throw new Error('Received an unsupported signal by name : ', signalName)
  }
}

const handleListMessagesResult = (_, commit, channelId, messages) => {
  commit('addMessagesToChannel', {
    channelId,
    messages: messages.map((msg) => {
      msg.createdBy = toUint8Array(msg.createdBy)
      return msg
    }).sort((a, b) => a.createdAt - b.createdAt)
  })
  commit('setLoadingChannelContent', { removeById: channelId })
}

let listChannelsIntervalId = null
let refreshChatterIntervalId = null

export default {
  namespaced: true,

  state: {
    channels: [],
    currentChannelId: null,
    loadingChannelContent: [],
    stats: {},
    statsLoading: false,
    agentHandle: null,
    // When this is true, the UI prompts the user to enter their handle.
    needsHandle: false
  },

  actions: {
    initialize({ dispatch }) {
      const currentChannelId = window.localStorage.getItem('currentChannelId')
      if (currentChannelId) {
        dispatch('joinChannel', currentChannelId)
      }
    },

    getStats: async ({ rootState, dispatch, commit }) => {
      commit('setStatsLoading', true)

      let stats
      try {
        stats = await callZome(dispatch, rootState, 'chat', 'agent_stats', null, 60000)
      } catch (e) {
        log('stats zomeCall error', e)
        commit('setStatsLoading', false)
        return
      }

      const {
        channelCount,
        messageCount
      } = rootState.elementalChat.channels.reduce((acc, channel) => ({
        channelCount: acc.channelCount + 1,
        messageCount: acc.messageCount + channel.messages.length
      }), {
        channelCount: 0,
        messageCount: 0
      })

      commit('setStats', {
        channelCount,
        messageCount,
        agentCount: stats.agents,
        activeCount: stats.active
      })
    },

    setChannelPolling({ dispatch }) {
      clearInterval(listChannelsIntervalId)
      listChannelsIntervalId = setInterval(() => {
        dispatch('listAllMessages')
      }, 3600000) // Polling every hour
    },

    setRefreshChatterInterval({ dispatch }) {
      clearInterval(refreshChatterIntervalId)
      // refresh chatter state every 2 hours
      refreshChatterIntervalId = setInterval(() => {
        dispatch('refreshChatter')
      }, 1000 * 60 * 60 * 2)
    },

    createChannel: async ({ commit, rootState, dispatch }, payload) => {
      const holochainPayload = {
        name: payload.info.name,
        entry: payload.entry
      }

      callZome(
        dispatch,
        rootState,
        'chat',
        'create_channel',
        holochainPayload,
        60000
      )
        .then(committedChannel => {
          committedChannel.last_seen = { First: null }
          commit('addChannels', [{ ...committedChannel, messages: [] }])
          dispatch('joinChannel', committedChannel.entry.uuid)
        })
        .catch(error => log('createChannel zome error', error))
    },

    listMessages: async ({ state, commit, rootState, dispatch }, { channel, earliest_seen, target_message_count }) => {
      const payload = {
        channel: channel.entry,
        earliest_seen,
        target_message_count: target_message_count || 20,
      }

      return callZome(dispatch, rootState, 'chat', 'list_messages', payload, 50000)
        .then(result => {
          if (result) {
            // NOTE: messages will be aggregated with current messages in following chain of fns
            handleListMessagesResult(state, commit, channel.entry.uuid, result.messages)
          }
        })
        .catch(error => log('listMessages zome error', error))
    },

    listAllMessages({ commit, state, rootState, dispatch, getters }) {
      // NOTE: To reduce the inital load expense, we have decided to call list_channels, then get only load first chuck for each channel
      // ** instead of calling the list_all_messages endpoint
      const payload = { category: 'General' }
      callZome(dispatch, rootState, 'chat', 'list_channels', payload, 30000)
        .then(async result => {
          if (result) {
            console.log('RESULT IN listAllMessages : ', result)

            commit('addChannels', result.channels)
            commit('setLoadingChannelContent', { addList: state.channels })

            // if current channel is the empty channel, join the first channel in the channel list
            if (getters.channel.info.name === '' && result.channels.length > 0) {
              dispatch('joinChannel', result.channels[0].entry.uuid)
            }

            result.channels.forEach(channel => {
              dispatch('listMessages', {
                channel,
                target_message_count: 20,
              })
            })
          }
        })
        .catch(error => log('list_channels zome error during listAllMessages call', error))
    },

    listChannels({ commit, rootState, dispatch, getters }) {
      const payload = { category: 'General' }
      callZome(dispatch, rootState, 'chat', 'list_channels', payload, 30000)
        .then(async result => {
          if (result) {
            commit('addChannels', result.channels)
            // if current channel is the empty channel, join the first channel in the channel list
            if (getters.channel.info.name === '' && result.channels.length > 0) {
              dispatch('joinChannel', result.channels[0].entry.uuid)
            }
          }
        })
        .catch(error => log('listChannels zome error', error))
    },

    handleMessageSignal: ({ commit }, payload) => {
      log('adding signal message: ', payload)
      commit('addChannels', [payload.channelData])
      commit('addMessagesToChannel', {
        channelId: payload.channelData.entry.uuid,
        messages: [payload.messageData]
      })
    },

    createMessage: async (
      { commit, rootState, dispatch, state },
      payload
    ) => {
      if (state.agentHandle === null) {
        throw new Error('cannot post message without having handle')
      }
      let lastSeen = payload.channel.last_seen
      if (lastSeen.Message) {
        lastSeen = {
          Message: toUint8Array(lastSeen.Message)
        }
      }

      const holochainPayload = {
        last_seen: lastSeen,
        channel: payload.channel.entry,
        entry: {
          uuid: uuidv4(),
          content: `${state.agentHandle}: ${payload.content}`
        },
        chunk: 0
      }

      let message
      try {
        message = await callZome(
          dispatch,
          rootState,
          'chat',
          'create_message',
          holochainPayload,
          60000)
      } catch (e) {
        log('createMessage zome error:', e)
        return
      }

      const channel = payload.channel

      commit('addMessagesToChannel', { channelId: channel.entry.uuid, messages: [message] })
      message.entryHash = toUint8Array(message.entryHash)
      message.createdBy = toUint8Array(message.createdBy)

      channel.info.created_by = toUint8Array(channel.info.created_by)
      channel.activeChatters = channel.activeChatters.map(c => toUint8Array(c))

      channel.messages = channel.messages.map((msg) => {
        msg.createdBy = toUint8Array(msg.createdBy)
        msg.entryHash = toUint8Array(msg.entryHash)
        msg.createdBy = toUint8Array(msg.createdBy)
        return msg
      })
      const chatters = payload.channel.activeChatters.map(c => toUint8Array(c))

      dispatch('signalSpecificChatters', {
        signal_message_data: {
          messageData: message,
          channelData: channel
        },
        chatters,
        include_active_chatters: true
      })
    },

    signalSpecificChatters: async ({ rootState, dispatch }, payload) => {
      callZome(dispatch, rootState, 'chat', 'signal_specific_chatters', payload, 60000)
        .catch(error => log('signalSpecificChatters zome error:', error))
    },

    refreshChatter({ dispatch, rootState }) {
      retryIfSourceChainHeadMoved(() => callZome(dispatch, rootState, 'chat', 'refresh_chatter', null, 30000))
    },

    joinChannel({ commit }, payload) {
      commit('setCurrentChannelId', payload)
    },

    updateProfile({ commit, dispatch, rootState }, payload) {
      const args = {
        nickname: payload
      }
      retryIfSourceChainHeadMoved(() => callZome(dispatch, rootState, 'profile', 'update_my_profile', args, 30000))
      commit('setAgentHandle', payload)
    },

    async getProfile({ commit, dispatch, rootState }) {
      const profile = await retryIfSourceChainHeadMoved(() => callZome(
        dispatch,
        rootState,
        'profile',
        'get_my_profile',
        null,
        30000
      ))

      if (profile && profile.nickname) {
        commit('setAgentHandle', profile.nickname)
      } else {
        commit('setNeedsHandle', true)
      }
    }
  },

  mutations: {
    addMessagesToChannel(state, { channelId, messages }) {
      const channel = { ...state.channels.find(channel => channel.entry.uuid === channelId) }

      // verify channel (within which the message belongs) exists
      if (!channel) return

      if (channel.messages === undefined) {
        channel.messages = []
      }

      channel.messages = uniqBy([...channel.messages, ...messages], message => message.entry.uuid)
        .sort((a, b) => a.createdAt - b.createdAt)

      const storedChannel = getStoredChannel(channelId)

      if (channel.entry.uuid !== state.currentChannelId &&
          storedChannel.lastMessageId !== getLastMessageId(channel)) {
        channel.unseen = true
      }


      state.channels = state.channels.map(c => {
        if (c.entry.uuid === channel.entry.uuid) {
          return channel
        } else {
          return c
        }
      })
    },

    setCurrentChannelId(state, uuid) {
      state.currentChannelId = uuid
      window.localStorage.setItem('currentChannelId', uuid)

      const channel = state.channels.find(channel => channel.entry.uuid === uuid)

      if (channel) {
        channel.unseen = false
        storeLastMessageId(uuid, getLastMessageId(channel))
      }
    },

    addChannels(state, newChannels) {
      const channels = state.channels
      // order is important in this uniqBy because we want existing copy of the channel to win

      state.channels = sortChannels(uniqBy([...channels, ...newChannels], channel => channel.entry.uuid))
        .map(c => ({
          last_seen: { First: null }, // and order is important in this object because we want existing values of c.last_seen to win
          messages: [],
          ...c
        }))
    },

    setLoadingChannelContent(state, { addList, removeById }) {
      if (addList) {
        state.loadingChannelContent = state.loadingChannelContent.length > 1
          ? uniqBy([...state.channels, ...addList], channel => channel.entry.uuid)
          : addList
      } else if (removeById) {
        state.loadingChannelContent = state.loadingChannelContent.length > 1
          ? remove(state.loadingChannelContent, channel => channel.entry.uuid === removeById)
          : []
      }
    },

    setStatsLoading(state, payload) {
      state.statsLoading = payload
    },

    setStats(state, payload) {
      state.statsLoading = false
      state.stats.agentCount = payload.agentCount
      state.stats.activeCount = payload.activeCount
      state.stats.channelCount = payload.channelCount
      state.stats.messageCount = payload.messageCount
    },

    setAgentHandle(state, payload) {
      state.agentHandle = payload
      if (payload) {
        state.needsHandle = false
      }
    },

    setNeedsHandle(state, payload) {
      state.needsHandle = payload
    }
  },

  getters: {
    channel: (state, _, { holochain: { agentKey } }) => {
      const emptyChannel = {
        info: { name: '' },
        entry: { category: 'General', uuid: '' },
        messages: [],
        activeChatters: [],
        unseen: false
      }

      if (state.currentChannelId === null) return emptyChannel

      const channel = state.channels.find(channel => channel.entry.uuid === state.currentChannelId)

      if (!channel) {
        console.log(`Couldn't find channel with uuid: ${state.currentChannelId}`)
        return emptyChannel
      }

      const activeChatters = uniqBy((channel.messages || []).map(message => message.createdBy), arrayBufferToBase64)
        .filter(userIdBuffer => arrayBufferToBase64(userIdBuffer) !== arrayBufferToBase64(agentKey))

      return {
        ...channel,
        activeChatters
      }
    },
    channelsLoading: (_, __, { holochain: { isLoading } }) => isLoading.create_channel || isLoading.list_channels,
    listMessagesLoading: (_, __, { holochain: { isLoading } }) => isLoading.list_messages,
    createMessageLoading: (_, __, { holochain: { isLoading } }) => isLoading.create_message
  }
}
