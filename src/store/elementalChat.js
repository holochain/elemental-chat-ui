import { v4 as uuidv4 } from 'uuid'
import { uniqBy } from 'lodash'
import { toUint8Array, log } from '@/utils'
import { arrayBufferToBase64 } from '@/store/utils'
import { callZome } from './holochain'

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

let listChannelsIntervalId = 0

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

export default {
  namespaced: true,
  state: {
    channels: [],
    currentChannelId: null,
    stats: {},
    showStats: false,
    statsLoading: false,
    error: {
      shouldShow: false,
      message: ''
    }
  },
  actions: {
    editHandle: async ({ rootState }) => {
      log('Updating Handle')
      rootState.needsHandle = true
    },
    getStats: async () => {
      // nada
    },
    resetStats () {
      // bupkis
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
        channel: payload.channel
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
          commit('addChannel', { ...committedChannel, messages: [] })
          log('created channel : ', committedChannel)
          dispatch('joinChannel', committedChannel.entry.uuid)
        })
        .catch(error => log('createChannel zome error', error))
    },
    listChannels ({ commit, rootState, dispatch, getters }, payload) {
      log('listChannels start')
      log('listChannels zome start')
      callZome(dispatch, rootState, 'chat', 'list_channels', payload, 30000)
        .then(async result => {
          log('listChannels zome done')

          if (!result) {
            log('listChannels zome returned undefined')
          } else {
            commit('setChannels', result.channels)
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
    handleMessageSignal: async ({ commit }, payload) => {
      log('adding signal message: ', payload)
      commit('addChannel', payload.channelData)
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
      if (payload.channel.last_seen.Message) {
        lastSeen = {
          Message: toUint8Array(payload.channel.last_seen.Message)
        }
      }

      const holochainPayload = {
        last_seen: lastSeen,
        channel: payload.channel.entry,
        message: {
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
      log('signalSpecificChatters start')
      callZome(dispatch, rootState, 'chat', 'signal_specific_chatters', payload, 60000)
        .then(result => {
          log('signalSpecificChatters zome done', result)
        })
        .catch(error => log('signalSpecificChatters zome error:', error))
    },
    async listMessages ({ commit, rootState, dispatch }, payload) {
      log('listMessages start')
      log('listMessages payload', payload)
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
          log('listMessages zome done')
          payload.channel.last_seen = { First: null }
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
    diplayErrorMessage ({ commit }, payload) {
      commit('setError', payload)
    },
    refreshChatter ({ dispatch, rootState }) {
      log('refreshChatter start')
      callZome(dispatch, rootState, 'chat', 'refresh_chatter', null, 30000)
        .then(() => {
          log('refreshChatter zome done')
        })
        .catch(error => log('refreshChatter zome error', error))
    },
    joinChannel ({ state, commit }, payload) {
      commit('setCurrentChannelId', payload)
      console.log('state.channels', state.channels.map(c => c.unseen))
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
    },
    setCurrentChannelId (state, uuid) {
      state.currentChannelId = uuid

      const channel = state.channels.find(channel => channel.entry.uuid === uuid)

      if (channel) {
        log('clearing unseen for channel id:', uuid)
        channel.unseen = false
      }
    },
    setChannels (state, payload) {
      payload.map(channel => {
        const found = state.channels.find(
          c => c.entry.uuid === channel.entry.uuid
        )
        if (found) {
          channel.unseen = found.unseen
        }
        return channel
      })

      state.channels = sortChannels(payload)
    },
    setChannelMessages (state, payload) {
      console.log('setting payload', payload)
      state.channels = state.channels.map(channel =>
        channel.entry.uuid !== payload.entry.uuid
          ? channel
          : { ...channel, ...payload })
    },
    addChannel (state, payload) {
      const channels = state.channels
      channels.push(payload)
      state.channels = sortChannels(uniqBy([...channels, payload], channel => channel.entry.uuid))
    },
    setError (state, payload) {
      state.error = payload
    },
    setUnseen (state, payload) {
      _setUnseen(state, payload)
    },
    loadStats (state) {
      state.showStats = true
      state.statsLoading = true
    },
    setStats (state, payload) {
      state.showStats = true
      state.statsLoading = false
      state.stats.agents = payload.agents
      state.stats.active = payload.active
      state.stats.channels = payload.channels
      state.stats.messages = payload.messages
    },
    resetStats (state) {
      state.showStats = undefined
      state.statsLoading = undefined
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
        console.error(`Couldn't find channel with uuid: ${state.currentChannelId}`)
        return emptyChannel
      }

      const activeChatters = uniqBy((channel.messages || []).map(message => message.createdBy), arrayBufferToBase64)

      return {
        ...channel,
        activeChatters
      }
    }
  }
}

function _setUnseen (state, uuid) {
  // find channel by uuid and update unseen when found
  const channel = state.channels.find(channel => channel.entry.uuid === uuid)

  if (channel) {
    log('setting unseen for channel id:', uuid)
    channel.unseen = true
  }
}