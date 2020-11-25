import waitUntil from "async-wait-until";

function pollMessages(dispatch, channel, date) {
  dispatch("listMessages", {
    channel: channel,
    date: date
  });
}

function logItToConsole(what, time) { // eslint-disable-line
  console.log(time, what);
}

const connectionReady = async webClient => {
  await waitUntil(() => webClient !== null, 30000, 100);
  console.log("holochainClient : ", webClient);
  return webClient;
};

const callZome = async (rootState, zome_name, fn_name, payload) => {
  // ensure we're connected before finishing init (...starting zome calls)
  await connectionReady(rootState.holochainClient, payload);
  return rootState.holochainClient.callZome({
    cap: null,
    cell_id: rootState.appInterface.cellId,
    zome_name,
    fn_name,
    provenance: rootState.agentKey,
    payload
  });
};

let intervalId = 0;

export default {
  namespaced: true,
  state: {
    channels: [],
    channel: {
      info: { name: "" },
      channel: { category: "General", uuid: "" },
      messages: []
    },
    error: {
      shouldShow: false,
      message: ""
    }
  },
  actions: {
    setChannel: async ({ commit, rootState, dispatch }, payload) => {
      logItToConsole("setChannel start", Date.now());
      rootState.hcDb.elementalChat
        .get(payload.channel.uuid)
        .then(channel => {
          logItToConsole("setChannel dexie done", Date.now());
          if (channel === undefined) channel = payload;
          commit("setChannel", channel);
          pollMessages(dispatch, payload, rootState.today);
          clearInterval(intervalId);
          intervalId = setInterval(function() {
            pollMessages(dispatch, payload, rootState.today);
          }, 50000);
        })
        .catch(error => logItToConsole(error));
    },
    addSignalChannel: async (
      { commit, state, rootState, dispatch },
      payload
    ) => {
      const committedChannel = payload;
      // don't add channel if already exists
      const channelExists = !!state.channels.find(
        channel => channel.channel.uuid === committedChannel.channel.uuid
      );
      if (channelExists) return;

      // currently this follows the same logic as if we had created our own channel...
      // todo: distinguish between committed and received channels
      logItToConsole("new channel signal received", Date.now());
      console.log("received channel : ", committedChannel);
      committedChannel.last_seen = { First: null };
      commit("createChannel", { ...committedChannel, messages: [] });
      rootState.hcDb.elementalChat
        .put(
          { ...committedChannel, messages: [] },
          committedChannel.channel.uuid
        )
        .then(logItToConsole("createChannel dexie done", Date.now()))
        .catch(error => logItToConsole(error));
      dispatch("setChannel", { ...committedChannel, messages: [] });
    },
    createChannel: async ({ commit, rootState, dispatch }, payload) => {
      logItToConsole("createChannel start", Date.now());
      const holochainPayload = {
        name: payload.info.name,
        channel: payload.channel
      };
      // rootState.holochainClient
      //   .callZome({
      //     cap: null,
      //     cell_id: rootState.appInterface.cellId,
      //     zome_name: "chat",
      //     fn_name: "create_channel",
      //     provenance: rootState.agentKey,
      //     payload: holochainPayload
      //   })
      callZome(rootState, "chat", "create_channel", holochainPayload).then(
        committedChannel => {
          logItToConsole("createChannel zome done", Date.now());
          committedChannel.last_seen = { First: null };
          commit("createChannel", { ...committedChannel, messages: [] });
          console.log("created channel : ", committedChannel);
          rootState.hcDb.elementalChat
            .put(
              { ...committedChannel, messages: [] },
              committedChannel.channel.uuid
            )
            .then(logItToConsole("createChannel dexie done", Date.now()))
            .catch(error => logItToConsole(error));
          dispatch("setChannel", { ...committedChannel, messages: [] });
        }
      );
    },
    listChannels({ commit, rootState, state, dispatch }, payload) {
      logItToConsole("listChannels start", Date.now());
      rootState.hcDb.elementalChat.get(payload.category).then(channels => {
        logItToConsole("get listChannels dexie done", Date.now());
        if (channels === undefined) channels = [];
        commit("setChannels", channels);
      });
      logItToConsole("listChannels zome start", Date.now());
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
          logItToConsole("listChannels zome done", Date.now());
          commit("setChannels", result.channels);
          logItToConsole("put listChannels dexie start", Date.now());
          rootState.hcDb.elementalChat
            .put(result.channels, payload.category)
            .then(logItToConsole("put listChannels dexie done", Date.now()))
            .catch(error => logItToConsole(error));
          if (state.channel.info.name === "" && result.channels.length > 0) {
            dispatch("setChannel", { ...result.channels[0], messages: [] });
          }
        });
    },
    addSignalMessageToChannel: async ({ rootState, state }, payload) => {
      const { channel: signalChannel, ...signalMessage } = payload;
      logItToConsole("new message signal received", Date.now());
      // verify channel (within which the message belongs) exists
      const appChannel = state.channels.find(
        channel => channel.channel.uuid === signalChannel.uuid
      );
      if (!appChannel) throw new Error("No channel exists for this message...");

      rootState.hcDb.elementalChat
        .get(appChannel.channel.uuid)
        .then(channel => {
          // verify message for channel does not already exist
          const messageExists = !!channel.messages.find(
            message => message.message.uuid === signalMessage.message.uuid
          );
          console.log("messageExists", messageExists);
          if (messageExists) return;

          console.log("received signal message : ", signalMessage);
          // if new message push to channel message list and update the channel
          const internalMessages = channel.messages.push(signalMessage);
          const internalChannel = {
            ...signalChannel,
            last_seen: { Message: signalMessage.entryHash },
            messages: internalMessages
          };

          console.log("adding signal message to the channel", internalChannel);
          logItToConsole("addSignalMessageToChannel dexie start", Date.now());
          rootState.hcDb.elementalChat
            .put(internalChannel, appChannel.channel.uuid)
            .then(
              logItToConsole("addSignalMessageToChannel dexie done", Date.now())
            )
            .catch(error => logItToConsole(error));
        })
        .catch(error => logItToConsole(error));
    },
    addMessageToChannel: async ({ commit, rootState, state }, payload) => {
      logItToConsole("addMessageToChannel start", Date.now());
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
          logItToConsole("addMessageToChannel zome done", Date.now());
          const internalMessages = [...state.channel.messages];
          internalMessages.push(message);
          const internalChannel = {
            ...payload.channel,
            last_seen: { Message: message.entryHash },
            messages: internalMessages
          };
          commit("setChannel", internalChannel);
          console.log("created message for channel", internalChannel);
          logItToConsole("addMessageToChannel dexie start", Date.now());
          rootState.hcDb.elementalChat
            .put(internalChannel, payload.channel.channel.uuid)
            .then(logItToConsole("addMessageToChannel dexie done", Date.now()))
            .catch(error => logItToConsole(error));
        })
        .catch(error => logItToConsole(error));
    },
    listMessages({ commit, rootState }, payload) {
      logItToConsole("listMessages start", Date.now());
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
          logItToConsole("listMessages zome done", Date.now());
          payload.channel.last_seen = { First: null };
          if (result.messages.length > 0) {
            payload.channel.last_seen = {
              Message: result.messages[result.messages.length - 1].entryHash
            };
          }
          const internalChannel = {
            ...payload.channel,
            messages: result.messages
          };
          commit("setChannelMessages", internalChannel);
          logItToConsole("put listMessages dexie start", Date.now());
          rootState.hcDb.elementalChat
            .put(internalChannel, payload.channel.channel.uuid)
            .then(logItToConsole("put listMessages dexie done", Date.now()))
            .catch(error => logItToConsole(error));
        })
        .catch(error => logItToConsole(error));
    },
    diplayErrorMessage({ commit }, payload) {
      commit("setError", payload);
    }
  },
  mutations: {
    setChannel(state, payload) {
      state.channel = { ...payload };
    },
    setChannels(state, payload) {
      state.channels = payload;
    },
    setChannelMessages(state, payload) {
      state.channels = state.channels.map(channel =>
        channel.channel.uuid !== payload.channel.uuid
          ? channel
          : { ...channel, ...payload }
      );
      if (state.channel.channel.uuid === payload.channel.uuid) {
        state.channel = { ...payload };
      }
    },
    createChannel(state, payload) {
      state.channels.push(payload);
    },
    setError(state, payload) {
      state.error = payload;
    }
  }
};
