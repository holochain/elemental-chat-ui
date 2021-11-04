import { v4 as uuidv4 } from 'uuid'
import { remove, uniqBy } from 'lodash'
import { toUint8Array, log } from '@/utils'
import { arrayBufferToBase64, retryIfSourceChainHeadMoved } from './utils'
import { callZome } from './callZome'

function sortChannels(val) {
  val.sort((a, b) => (a.info.name > b.info.name ? 1 : -1))
  return val
}

function storeChannels(channels) {
  const storedChannels = JSON.parse(window.localStorage.getItem('channels') || '{}')
  window.localStorage.setItem('channels', JSON.stringify(channels.reduce((acc, channel) => {
    const id = channel.entry.uuid

    const storedChannel = storedChannels[id] || {
      messageCount: 0,
      unseen: false
    }

    // TODO: this logic needs updating to track the most recent message seen in each channel

    const messageCount = 0

    acc[id] = {
      ...storedChannel,
      messageCount,
      unseen: channel.unseen || storedChannel.unseen // overwrites with stored value because if unseen isn't set, we just did a page load
    }

    return acc
  }, {})))
}

function storeChannelUnseen(id, unseen) {
  const currentChannelCounts = JSON.parse(window.localStorage.getItem('channels') || '{}')
  window.localStorage.setItem('channels', JSON.stringify({
    ...currentChannelCounts,
    [id]: {
      ...currentChannelCounts[id],
      unseen
    }
  }))
}

function getStoredStats() {
  const channelCountsString = window.localStorage.getItem('channels')

  const zeroStats = {
    channelCount: 0,
    messageCount: 0
  }

  if (channelCountsString) {
    const channelCounts = JSON.parse(channelCountsString)
    return Object.entries(channelCounts).reduce((acc, [_, { messageCount }]) => {
      acc.channelCount++
      acc.messageCount += messageCount
      return acc
    }, zeroStats)
  } else {
    return zeroStats
  }
}

function getStoredChannel(id) {
  const channels = JSON.parse(window.localStorage.getItem('channels') || '{}')
  if (channels[id]) {
    return channels[id]
  } else {
    console.error(`tried to find message count for unknown channel ${id}`)
    return {
      unseen: false,
      messageCount: 0
    }
  }
}

export const handleSignal = (signal, dispatch) => {
  const signalData = signal.data.payload
  const { signal_name: signalName, signal_payload: signalPayload } = signalData

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

const handleListMessagesResult = (state, commit, channelId, messages) => {
  const channel = state.channels.find(
    c => c.entry.uuid === channelId
  )
  commit('addMessagesToChannel', {
    channel,
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

      commit('setStats', {
        ...getStoredStats(),
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
    listMessages: async ({ state, commit, rootState, dispatch }, { channel, earlier_than, target_message_count, active_chatter }) => {      
      
      const payload = { 
        channel,
        earlier_than,
        target_message_count,
        active_chatter
      }

      return callZome(dispatch, rootState, 'chat', 'list_messages', payload, 50000)
        .then(async result => {
          if (result) {
            // NOTE: messages will be aggregated with current messages in following chain of fns
            handleListMessagesResult(state, commit, channel_id, result.messages)
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
            commit('addChannels', result.channels)
            commit('setLoadingChannelContent', { addList: state.channels })

            // if current channel is the empty channel, join the first channel in the channel list
            if (getters.channel.info.name === '' && result.channels.length > 0) {
              dispatch('joinChannel', result.channels[0].entry.uuid)
            }

            result.channels.forEach(channel => {
              dispatch('listMessages', { 
                channel, 
                earlier_than: null,
                target_message_count: 20,
                activeChatter: true
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
      commit('addMessage', {
        channelId: payload.channelData.entry.uuid,
        message: payload.messageData
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

      if (payload.channel.totalMessageCount === undefined) {
        payload.channel.totalMessageCount = 0
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

      commit('addMessagesToChannel', { channel, messages: [message] })
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
    addMessage(state, { channelId, message }) {
      const channel = { ...state.channels.find(channel => channel.entry.uuid === channelId) }

      if (!channel) {
        throw new Error(`Tried to add message to channel we don't have: ${channelId}`)
      }

      if (channel.messages.some(channelMessage => channelMessage.entry.uuid === message.entry.uuid)) return

      channel.messages = [...channel.messages, message].sort((a, b) => a.createdAt - b.createdAt)

      // Set the updated channel to unseen if it's not the current channel and if it now has more messages than our stored count
      const storedChannel = getStoredChannel(channel.entry.uuid)
      if (state.currentChannelId !== channel.entry.uuid &&
        totalMessageCount > storedChannel.messageCount
      ) {
        const { unseen } = _setUnseen(state, channel.entry.uuid)
        channel.unseen = unseen
      }

      console.log('CHANNEL complete : ', channel)

      state.channels = state.channels.map(c => {
        if (c.entry.uuid === channel.entry.uuid) {
          return channel
        } else {
          return c
        }
      })

      // Update stats. This is a relatively expensive thing to do. There are definitely more effecient ways of updating.
      // If the UI seems sluggish, look here for possible optimizations.
      storeChannels(state.channels)
    },
    addMessagesToChannel(state, payload) {
      const { channel, messages } = payload

      // verify channel (within which the message belongs) exists
      const doesChannelExist = state.channels.find(
        c => c.entry.uuid === channel.entry.uuid
      )
      if (!doesChannelExist) return

      const storedChannel = getStoredChannel(channel.entry.uuid)
      if (channel.messages === undefined) {
        channel.messages = []
        // if this channel doesn't have any messages yet, we restore the unseen status
        channel.unseen = storedChannel.unseen
      }
      channel.messages = uniqBy([...channel.messages, ...messages], message => message.entry.uuid)
        .sort((a, b) => a.createdAt - b.createdAt)

      // Set the updated channel to unseen if it's not the current channel and if it now has more messages than our stored count
      if (state.currentChannelId !== channel.entry.uuid &&
        totalMessageCount > storedChannel.messageCount
      ) {
        const { unseen } = _setUnseen(state, channel.entry.uuid)
        channel.unseen = unseen
      }

      console.log('CHANNEL complete : ', channel)

      state.channels = state.channels.map(c => {
        if (c.entry.uuid === channel.entry.uuid) {
          return channel
        } else {
          return c
        }
      })

      // Update stats. This is a relatively expensive thing to do. There are definitely more effecient ways of updating.
      // If the UI seems sluggish, look here for possible optimizations.
      storeChannels(state.channels)
    },
    setCurrentChannelId(state, uuid) {
      state.currentChannelId = uuid
      window.localStorage.setItem('currentChannelId', uuid)

      const channel = state.channels.find(channel => channel.entry.uuid === uuid)

      if (channel) {
        channel.unseen = false
        storeChannelUnseen(uuid, false)
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

      storeChannels(state.channels)
    },
    setUnseen(state, payload) {
      _setUnseen(state, payload)
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

function _setUnseen(state, uuid) {
  // find channel by uuid and update unseen when found
  const channel = state.channels.find(channel => channel.entry.uuid === uuid)

  if (channel) {
    channel.unseen = true
    storeChannelUnseen(uuid)
  }
  return channel
}
