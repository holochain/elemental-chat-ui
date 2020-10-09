export default {
  namespaced: true,
  state: {},
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
    addMessageToChannel: async ({ commit }, payload) => {
      commit("addMessageToChannel", payload);
    }
  },
  mutations: {
    createChannel(state, payload) {
      if (!state.channels) state.channels = [];
      state.channels.push(payload);
      console.log(state.channels);
    },
    listChannels(state, payload) {
      console.log(payload);
      state.channels = payload;
      console.log(state.channels);
    },
    addMessageToChannel(state, payload) {
      const internalChannel = {
        ...state.channels.find(c => {
          return c.channel.uuid === payload.channel.channel.uuid;
        })
      };
      internalChannel.messages.push(payload.message);
      state.channels = state.channels.map(channel =>
        channel.channel.uuid !== payload.channel.uuid
          ? channel
          : { ...channel, ...internalChannel }
      );
    }
  }
};
