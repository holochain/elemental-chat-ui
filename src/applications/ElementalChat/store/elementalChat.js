export default {
  namespaced: true,
  state: {
    channels: [],
    channel: {
      name: "",
      channel: { category: "General", uuid: "" },
      messages: []
    }
  },
  actions: {
    setChannel: async ({ commit, rootState, state, dispatch }, payload) => {
      commit("setChannel", payload);
      dispatch("listMessages", { channel: payload, date: rootState.today });
      clearInterval(state.intervalId);
      const intervalId = setInterval(() => {
        dispatch("listMessages", { channel: payload, date: rootState.today });
      }, 1000);
      commit("setIntervalId", intervalId);
    },
    createChannel: async ({ commit, rootState, dispatch }, payload) => {
      rootState.holochainClient
        .callZome({
          cap: null,
          cell_id: rootState.appInterface.cellId,
          zome_name: "chat",
          fn_name: "create_channel",
          provenance: rootState.agentKey,
          payload: payload
        })
        .then(committedChannel => {
          const newChannel = {
            name: committedChannel.info.name,
            channel: committedChannel.channel,
            messages: []
          };
          commit("createChannel", newChannel);
          dispatch("setChannel", newChannel);
        });
    },
    listChannels({ commit, rootState, state, dispatch }, payload) {
      rootState.holochainClient
        .callZome({
          cap: null,
          cell_id: rootState.appInterface.cellId,
          zome_name: "chat",
          fn_name: "list_channels",
          provenance: rootState.agentKey,
          payload: payload
        })
        .then(result => {
          commit("setChannels", result);
          if (state.channel.name === "" && result.channels.length > 0) {
            const firstChannel = {
              name: result.channels[0].info.name,
              channel: result.channels[0].channel,
              messages: []
            };
            dispatch("setChannel", firstChannel);
          }
        });
    },
    addMessageToChannel: async ({ commit, rootState }, payload) => {
      const holochainPayload = {
        last_seen: payload.channel.last_seen,
        channel: payload.channel.channel,
        message: {
          ...payload.message,
          content: `${rootState.agentHandle}
        ${payload.message.content}`
        }
      };
      rootState.holochainClient
        .callZome({
          cap: null,
          cell_id: rootState.appInterface.cellId,
          zome_name: "chat",
          fn_name: "create_message",
          provenance: rootState.agentKey,
          payload: holochainPayload
        })
        .then(message => {
          commit("addChannelMessage", {
            channel: payload.channel,
            message: message
          });
        });
    },
    listMessages: async ({ commit, rootState }, payload) => {
      const holochainPayload = {
        channel: payload.channel.channel,
        date: payload.date
      };
      rootState.holochainClient
        .callZome({
          cap: null,
          cell_id: rootState.appInterface.cellId,
          zome_name: "chat",
          fn_name: "list_messages",
          provenance: rootState.agentKey,
          payload: holochainPayload
        })
        .then(result => {
          commit("setChannelMessages", {
            ...payload.channel,
            messages: result.messages
          });
        });
    }
  },
  mutations: {
    setChannel(state, payload) {
      state.channel = payload;
    },
    setIntervalId(state, payload) {
      state.intervalId = payload;
    },
    createChannel(state, payload) {
      state.channels.push(payload);
    },
    setChannels(state, payload) {
      const internalChannels = [];
      payload.channels.forEach(c => {
        const newChannel = {
          name: c.info.name,
          channel: c.channel,
          messages: []
        };
        internalChannels.push(newChannel);
      });
      state.channels = internalChannels;
    },
    addChannelMessage(state, payload) {
      const internalChannel = payload.channel;
      const internalMessage = payload.message;
      console.log(payload);
      internalMessage.content = internalMessage.message.content;
      internalChannel.last_seen = { Message: internalMessage.entryHash };
      internalChannel.messages.push(internalMessage);
      state.channel = { ...internalChannel };
    },
    setChannelMessages(state, payload) {
      const internalChannel = payload;
      payload.messages.map(m => {
        m.content = m.message.content;
        internalChannel.last_seen = { Message: m.entryHash };
      });
      state.channel = { ...internalChannel };
    }
  }
};
