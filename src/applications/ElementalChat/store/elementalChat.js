export default {
  namespaced: true,
  state: {
    channels: []
  },
  actions: {
    createChannel: async ({ commit, rootState }, payload) => {
      const committedChannel = await rootState.holochainClient.callZome({
        cap: null,
        cell_id: rootState.appInterface.cellId,
        zome_name: "chat",
        fn_name: "create_channel",
        provenance: rootState.agentKey,
        payload: payload
      });
      payload.info = committedChannel.info;
      commit("createChannel", payload);
    },
    listChannels: async ({ commit, rootState }, payload) => {
      const channelsList = await rootState.holochainClient.callZome({
        cap: null,
        cell_id: rootState.appInterface.cellId,
        zome_name: "chat",
        fn_name: "list_channels",
        provenance: rootState.agentKey,
        payload: payload
      });
      commit("listChannels", channelsList);
    },
    addMessageToChannel: async ({ commit, rootState }, payload) => {
      const committedChannel = await rootState.holochainClient.callZome({
        cap: null,
        cell_id: rootState.appInterface.cellId,
        zome_name: "chat",
        fn_name: "create_message",
        provenance: rootState.agentKey,
        payload: payload
      });
      payload.last_seen = { Message: committedChannel.entryHash };
      console.log(payload);
      commit("addMessageToChannel", payload);
    }
  },
  mutations: {
    createChannel(state, payload) {
      if (!state.channels) state.channels = [];
      const newChannel = {
        name: payload.info.name,
        channel: payload.channel,
        messages: []
      };
      state.channels.push(newChannel);
    },
    listChannels(state, payload) {
      payload.channels.forEach(c => {
        let channel = state.channels.find(
          ch => ch.channel.uuid === c.channel.uuid
        );
        if (channel !== undefined) {
          const listedChannel = {
            name: c.info.name,
            channel: c.channel,
            messages: channel.messages
          };
          state.channels = state.channels.map(c =>
            c.channel.uuid !== listedChannel.channel.uuid
              ? c
              : { ...c, ...listedChannel }
          );
        } else {
          const newChannel = {
            name: c.info.name,
            channel: c.channel,
            messages: []
          };
          state.channels.push(newChannel);
        }
      });
    },
    addMessageToChannel(state, payload) {
      const internalChannel = {
        ...state.channels.find(c => {
          return c.channel.uuid === payload.channel.uuid;
        })
      };
      internalChannel.messages.push(payload.message);
      internalChannel.last_seen = payload.last_seen;
      state.channels = state.channels.map(channel =>
        channel.channel.uuid !== payload.channel.uuid
          ? channel
          : { ...channel, ...internalChannel }
      );
    }
  }
};
