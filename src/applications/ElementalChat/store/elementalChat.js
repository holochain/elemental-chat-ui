function today() {
  var today = new Date();
  var dd = String(today.getUTCDate());
  var mm = String(today.getUTCMonth() + 1); //January is 0!
  var yyyy = String(today.getUTCFullYear());
  return { year: yyyy, month: mm, day: dd };
}
export default {
  namespaced: true,
  state: {
    channels: [],
    channel: {
      name: "",
      channel: { category: "General", uuid: "" },
      messages: []
    },
    today: today()
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
      commit("addMessageToChannel", payload);
    },
    listMessages: async ({ commit, rootState }, payload) => {
      const holochainPayload = {
        channel: payload.channel.channel,
        date: payload.date
      };
      const messagesList = await rootState.holochainClient.callZome({
        cap: null,
        cell_id: rootState.appInterface.cellId,
        zome_name: "chat",
        fn_name: "list_messages",
        provenance: rootState.agentKey,
        payload: holochainPayload
      });
      payload.channel.messages = messagesList.messages;
      commit("listMessages", payload.channel);
    }
  },
  mutations: {
    setChannel(state, payload) {
      state.channel = payload;
    },
    createChannel(state, payload) {
      if (!state.channels) state.channels = [];
      const newChannel = {
        name: payload.info.name,
        channel: payload.channel,
        messages: []
      };
      state.channel = newChannel;
      state.channels.push(newChannel);
    },
    listChannels(state, payload) {
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
      console.log(state.channels);
    },
    addMessageToChannel(state, payload) {
      console.log(payload);
      const internalChannel = {
        ...state.channels.find(c => {
          console.log(c.channel);
          console.log(payload.channel);
          return c.channel.uuid === payload.channel.uuid;
        })
      };
      console.log(state.channels);
      console.log(internalChannel);
      internalChannel.messages.push(payload.message);
      internalChannel.last_seen = payload.last_seen;
      state.channel = { ...internalChannel };
    },
    listMessages(state, payload) {
      console.log(payload);
      const internalChannel = payload;
      payload.messages.map(m => {
        m.content = m.message.content;
      });
      internalChannel.messages = payload.messages;
      state.channel = { ...internalChannel };
      console.log(state);
    }
  }
};
