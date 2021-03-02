import { toUint8Array, log } from '@/utils'
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
  console.log('calling handleSignal', signalData)
  switch (signalName) {
    case 'Message':
      console.log('INCOMING SIGNAL > NEW MESSAGE')
      console.log('payload' + JSON.stringify(signalPayload))
      dispatch('elementalChat/addSignalMessageToChannel', signalPayload, { root: true })
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
    addSignalChannel: async (
      { commit, state, dispatch },
      payload
    ) => {
      const committedChannel = payload
      // don't add channel if already exists
      const channelExists = !!state.channels.find(
        channel => channel.entry.uuid === committedChannel.entry.uuid
      )
      if (channelExists) return

      // currently this follows the same logic as if we had created our own channel...
      // todo: distinguish between committed and received channels
      log('new channel signal received')
      log('received channel : ', committedChannel)
      committedChannel.last_seen = { First: null }
      commit('createChannel', { ...committedChannel, messages: [] })
      commit('setCurrentChannelId', committedChannel.entry.uuid)
    },
    createChannel: async ({ commit, rootState, dispatch }, payload) => {
      log('createChannel start')
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
          log('createChannel zome done')
          committedChannel.last_seen = { First: null }
          commit('createChannel', { ...committedChannel, messages: [] })
          log('created channel : ', committedChannel)
          commit('setCurrentChannelId', committedChannel.entry.uuid)
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
              commit('setCurrentChannelId', result.channels[0].entry.uuid)
            }

            // Get messages for the newChannels without active_chatter
            newChannels.forEach(channel =>
              pollMessages(dispatch, false, channel)
            )
          }
        })
        .catch(error => log('listChannels zome error', error))
    },
    addSignalMessageToChannel: async ({ commit }, payload) => {
      log('adding signal message: ', payload)
      commit('addMessageToChannel', {
        channel: payload.channelData,
        message: payload.messageData
      })
    },
    addMessageToChannel: async (
      { commit, rootState, state, dispatch },
      payload
    ) => {
      log('addMessageToChannel start')

      console.log('payload', payload)
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
          ...payload.message,
          content: `${rootState.agentHandle.toUpperCase()}:
      ${payload.message.content}`
        },
        chunk: 0
      }
      log('addMessageToChannel start', holochainPayload)
      callZome(
        dispatch,
        rootState,
        'chat',
        'create_message',
        holochainPayload,
        60000
      )
        .then(message => {
          log('addMessageToChannel zome done')
          commit('addMessageToChannel', { channel: payload.channel, message })

          message.entryHash = toUint8Array(message.entryHash)
          message.createdBy = toUint8Array(message.createdBy)
          const channel = payload.channel
          channel.info.created_by = toUint8Array(channel.info.created_by)
          const signalMessageData = {
            messageData: message,
            channelData: channel
          }
          log('sending signalMessages', signalMessageData)
          dispatch('signalMessageSent', signalMessageData)
        })
        .catch(error => log('addMessageToChannel zome error:', error))
    },
    signalMessageSent: async ({ rootState, dispatch }, payload) => {
      log('signalMessageSent start')
      callZome(dispatch, rootState, 'chat', 'signal_chatters', payload, 60000)
        .then(result => {
          log('signalMessageSent zome done', result)
        })
        .catch(error => log('signalMessageSent zome error:', error))
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
            const data = toUint8Array(
              result.messages[result.messages.length - 1].entryHash
            )
            payload.channel.last_seen = {
              Message: data
            }
          }

          const messages = [...result.messages]

          messages.sort((a, b) => a.createdAt[0] - b.createdAt[0])

          const internalChannel = {
            ...payload.channel,
            messages
          }

          commit('setChannelMessages', internalChannel)
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
    }
  },
  mutations: {
    addMessageToChannel (state, payload) {
      const { channel, message } = payload

      console.log('addmessagetochannel', payload)

      // verify channel (within which the message belongs) exists
      const appChannel = state.channels.find(
        c => c.entry.uuid === channel.entry.uuid
      )
      if (!appChannel) return

      if (appChannel.messages === undefined) {
        appChannel.messages = []
      }

      // verify message for channel does not already exist
      const messageExists = !!appChannel.messages.find(
        m => message.entry.uuid === m.entry.uuid
      )
      if (messageExists) return

      appChannel.messages.push(message)
      appChannel.messages.sort((a, b) => a.createdAt[0] - b.createdAt[0])

      log('got message', message)
      log(
        `adding message to the channel ${appChannel.entry.uuid}`,
        appChannel
      )

      state.channels = state.channels.map(c => {
        if (c.entry.uuid === channel.entry.uuid) {
          return appChannel
        } else {
          return c
        }
      })

      // Set the updated channel to unseen if it's not the current channel
      if (state.currentChannelId !== appChannel.entry.uuid) {
        _setUnseen(state, appChannel.entry.uuid)
      }
    },
    setCurrentChannelId (state, payload) {
      _setCurrentChannelId(state, payload)
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
    createChannel (state, payload) {
      const channels = state.channels
      channels.push(payload)
      state.channels = sortChannels(channels)
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
        unseen: false
      }

      if (state.currentChannelId === null) return emptyChannel

      const channel = state.channels.find(channel => channel.entry.uuid === state.currentChannelId)
      if (!channel) {
        console.error(`Couldn't find channel with uuid: ${state.currentChannelId}`)
        return emptyChannel
      }

      return channel
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

function _setCurrentChannelId (state, uuid) {
  log('setCurrentChannelId', uuid)
  state.currentChannelId = uuid

  const channel = state.channels.find(channel => channel.entry.uuid === uuid)

  if (channel) {
    log('clearing unseen for channel id:', uuid)
    channel.unseen = false
  }
}
