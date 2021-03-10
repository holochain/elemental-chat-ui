import { v4 as uuidv4 } from 'uuid'
import { uniqBy } from 'lodash'
import { toUint8Array, log } from '@/utils'
import { arrayBufferToBase64 } from '@/store/utils'
import { callZome } from './callZome'

function pollMessages (dispatch, activeChatter, channel) {
  dispatch('listMessages', {
    channel: channel,
    chunk: { start: 0, end: 0 },
    active_chatter: activeChatter
  })
}

function sortChannels (val) {
  val.sort((a, b) => (a.info.name > b.info.name ? 1 : -1))
  return val
}

function storeChannelCounts (channels) {
  const currentChannelCounts = JSON.parse(window.localStorage.getItem('channelCounts') || '{}')
  window.localStorage.setItem('channelCounts', JSON.stringify(channels.reduce((acc, channel) => {
    const id = channel.entry.uuid
    const messagesLength = (channel.messages || []).length
    acc[id] = Math.max(messagesLength, currentChannelCounts[id])
    return acc
  }, {})))
}

function getStoredStats () {
  const channelCountsString = window.localStorage.getItem('channelCounts')

  const zeroStats = {
    channelCount: 0,
    messageCount: 0
  }

  if (channelCountsString) {
    const channelCounts = JSON.parse(channelCountsString)
    return Object.entries(channelCounts).reduce((acc, [_, messageCount]) => {
      acc.channelCount++
      acc.messageCount += messageCount
      return acc
    }, zeroStats)
  } else {
    return zeroStats
  }
}

export const handleSignal = (signal, dispatch) => {
  const signalData = signal.data.payload
  const { signal_name: signalName, signal_payload: signalPayload } = signalData
  switch (signalName) {
    case 'Message':
      // even though this is defined in the elementalChat store module, it still needs to be called with full namespaced because it's actually called
      // in the context of the holochain store module (hence the export).
      dispatch('elementalChat/handleMessageSignal', signalPayload, { root: true })
      break
    default:
      throw new Error('Received an unsupported signal by name : ', signalName)
  }
}

let listChannelsIntervalId = 0

export default {
  namespaced: true,
  state: {
    channels: [],
    currentChannelId: null,
    stats: {},
    statsLoading: false
  },
  actions: {
    initialize ({ state, dispatch }) {
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
    setChannelPolling: async ({ dispatch }) => {
      clearInterval(listChannelsIntervalId)
      listChannelsIntervalId = setInterval(function () {
        dispatch('listChannels', { category: 'General' })
      }, 300000) // Polling every 5mins
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
    listChannels ({ commit, rootState, dispatch, getters }, payload) {
      callZome(dispatch, rootState, 'chat', 'list_channels', payload, 30000)
        .then(async result => {
          if (result) {
            commit('addChannels', result.channels)
            let newChannels = []
            newChannels = result.channels

            if (getters.channel.info.name === '' && result.channels.length > 0) {
              dispatch('joinChannel', result.channels[0].entry.uuid)
            }

            // Get messages for the newChannels without active_chatter
            newChannels.forEach(channel =>
              pollMessages(dispatch, false, channel)
            )
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
      { commit, rootState, dispatch },
      payload
    ) => {
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
          content: `${rootState.agentHandle}: ${payload.content}`
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

      commit('addMessagesToChannel', { channelId: payload.channel.entry.uuid, messages: [message] })

      message.entryHash = toUint8Array(message.entryHash)
      message.createdBy = toUint8Array(message.createdBy)
      const channel = payload.channel
      channel.info.created_by = toUint8Array(channel.info.created_by)

      dispatch('signalSpecificChatters', {
        signal_message_data: {
          messageData: message,
          channelData: channel
        },
        chatters: payload.channel.activeChatters,
        include_active_chatters: true
      })
    },
    signalSpecificChatters: async ({ rootState, dispatch }, payload) => {
      callZome(dispatch, rootState, 'chat', 'signal_specific_chatters', payload, 60000)
        .catch(error => log('signalSpecificChatters zome error:', error))
    },
    async listMessages ({ commit, rootState, dispatch }, payload) {
      const holochainPayload = {
        channel: payload.channel.entry,
        chunk: payload.chunk,
        active_chatter: payload.active_chatter
      }

      callZome(
        dispatch,
        rootState,
        'chat',
        'list_messages',
        holochainPayload,
        30000
      )
        .then(result => {
          if (result.messages.length > 0) {
            const messageHash = toUint8Array(
              result.messages[result.messages.length - 1].entryHash
            )
            payload.channel.last_seen = {
              Message: messageHash
            }
          }

          const messages = [...result.messages]

          messages.sort((a, b) => a.createdAt[0] - b.createdAt[0])

          commit('addMessagesToChannel', {
            channelId: payload.channel.entry.uuid,
            messages
          })
        })
        .catch(error => log('listMessages zome done', error))
    },
    refreshChatter ({ dispatch, rootState }) {
      callZome(dispatch, rootState, 'chat', 'refresh_chatter', null, 30000)
        .catch(error => log('refreshChatter zome error', error))
    },
    joinChannel ({ commit }, payload) {
      commit('setCurrentChannelId', payload)
    }
  },
  mutations: {
    addMessagesToChannel (state, payload) {
      const { channelId, messages } = payload

      // verify channel (within which the message belongs) exists
      const channel = state.channels.find(
        c => c.entry.uuid === channelId
      )
      if (!channel) return

      if (channel.messages === undefined) {
        channel.messages = []
      }

      channel.messages = uniqBy([...channel.messages, ...messages], message => message.entry.uuid)
        .sort((a, b) => a.createdAt[0] - b.createdAt[0])

      state.channels = state.channels.map(c => {
        if (c.entry.uuid === channel.entry.uuid) {
          return channel
        } else {
          return c
        }
      })

      // Set the updated channel to unseen if it's not the current channel
      if (state.currentChannelId !== channel.entry.uuid) {
        _setUnseen(state, channel.entry.uuid)
      }

      // Update stats. This is a relatively expensive thing to do. There are definitely more effecient ways of updating.
      // If the UI seems sluggish, look here for possible optimizations.
      storeChannelCounts(state.channels)
    },
    setCurrentChannelId (state, uuid) {
      state.currentChannelId = uuid
      window.localStorage.setItem('currentChannelId', uuid)

      const channel = state.channels.find(channel => channel.entry.uuid === uuid)

      if (channel) {
        channel.unseen = false
      }
    },
    addChannels (state, newChannels) {
      const channels = state.channels

      // order is important in this uniqBy because we want existing copy of the channel to win
      state.channels = sortChannels(uniqBy([...channels, ...newChannels], channel => channel.entry.uuid))
        .map(c => ({
          last_seen: { First: null }, // and order is important in this object because we want existing values of c.last_seen to win
          ...c
        }))

      storeChannelCounts(state.channels)
    },
    setUnseen (state, payload) {
      _setUnseen(state, payload)
    },
    setStatsLoading (state, payload) {
      state.statsLoading = payload
    },
    setStats (state, payload) {
      state.statsLoading = false
      state.stats.agentCount = payload.agentCount
      state.stats.activeCount = payload.activeCount
      state.stats.channelCount = payload.channelCount
      state.stats.messageCount = payload.messageCount
    }
  },
  getters: {
    channel: state => {
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

function _setUnseen (state, uuid) {
  // find channel by uuid and update unseen when found
  const channel = state.channels.find(channel => channel.entry.uuid === uuid)

  if (channel) {
    channel.unseen = true
  }
}
