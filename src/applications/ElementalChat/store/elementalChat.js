function pollMessages(dispatch, active_chatter, channel) {
  dispatch("listMessages", {
    channel: channel,
    chunk: { start: 0, end: 0 },
    active_chatter
  });
}

function logItToConsole(what, time) { // eslint-disable-line
  console.log(time, what);
}

const doResetConnection = async dispatch => {
  return dispatch("resetConnectionState", null, { root: true });
};

const callZome = async (dispatch, rootState, zome_name, fn_name, payload) => {
  if (rootState.conductorDisconnected) {
    return;
  }
  try {
    const result = await rootState.holochainClient.callZome({
      cap: null,
      cell_id: rootState.appInterface.cellId,
      zome_name,
      fn_name,
      provenance: rootState.agentKey,
      payload
    });
    return result;
  } catch (error) {
    console.log("callZome threw error: ", error);
    if (error == "Error: Socket is not open")
      return doResetConnection(dispatch);
  }
};

function _addMessageToChannel(rootState, commit, state, channel, message) {
  const internalMessages = [...state.channel.messages];
  internalMessages.push(message);
  const internalChannel = {
    ...channel,
    last_seen: { Message: message.entryHash },
    messages: internalMessages
  };

  internalMessages.sort((a, b) => a.createdAt[0] - b.createdAt[0]);

  console.log("got message", message);
  console.log(
    "adding message to the channel",
    internalChannel.channel.uuid,
    internalChannel
  );
  logItToConsole("addMessageToChannel dexie start", Date.now());

  // if this update was to the currently selected channel, then we
  // also have to update the state.channel object
  if (state.channel.channel.uuid == channel.channel.uuid) {
    commit("setChannel", internalChannel);
  } else {
    commit("setUnseen", channel.channel.uuid);
  }

  rootState.hcDb.elementalChat
    .put(internalChannel, channel.channel.uuid)
    .then(logItToConsole("addMessageToChannel dexie done", Date.now()))
    .catch(error => logItToConsole(error));
}

let intervalId = 0;

export default {
  namespaced: true,
  state: {
    channels: [],
    channel: {
      info: { name: "" },
      channel: { category: "General", uuid: "" },
      messages: [],
      unseen: false
    },
    error: {
      shouldShow: false,
      message: ""
    }
  },
  actions: {
    updateHandle: async ({ rootState }) => {
      logItToConsole("updateHandle start", Date.now());
      rootState.needsHandle = true;
    },
    setChannel: async ({ commit, rootState, dispatch }, payload) => {
      logItToConsole("setChannel start", Date.now());
      rootState.hcDb.elementalChat
        .get(payload.channel.uuid)
        .then(channel => {
          logItToConsole("setChannel dexie done", Date.now());
          if (channel === undefined) channel = payload;
          commit("setChannel", channel);
          pollMessages(dispatch, true, payload);
          clearInterval(intervalId);
          intervalId = setInterval(function() {
            pollMessages(dispatch, true, payload);
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
      callZome(
        dispatch,
        rootState,
        "chat",
        "create_channel",
        holochainPayload
      ).then(committedChannel => {
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
      });
    },
    listChannels({ commit, rootState, state, dispatch }, payload) {
      logItToConsole("listChannels start", Date.now());
      rootState.hcDb.elementalChat.get(payload.category).then(channels => {
        logItToConsole("get listChannels dexie done", Date.now());
        if (channels === undefined) return;
        commit("setChannels", channels);
      });
      logItToConsole("listChannels zome start", Date.now());
      callZome(dispatch, rootState, "chat", "list_channels", payload).then(
        async result => {
          logItToConsole("listChannels zome done", Date.now());
          commit("setChannels", result.channels);
          logItToConsole("put listChannels dexie start", Date.now());
          let hcDBState = await rootState.hcDb.elementalChat.get("General");
          let newChannels = [];
          newChannels = result.channels.filter(channel => {
            return !hcDBState.find(c => c.channel.uuid == channel.channel.uuid);
          });
          rootState.hcDb.elementalChat
            .put(result.channels, payload.category)
            .then(logItToConsole("put listChannels dexie done", Date.now()))
            .catch(error => logItToConsole(error));
          console.log(">>> SETTING channels in indexDb : ", result.channels);

          if (state.channel.info.name === "" && result.channels.length > 0)
            dispatch("setChannel", { ...result.channels[0], messages: [] });

          // Get messages for the newChannels without active_chatter
          newChannels.forEach(channel =>
            pollMessages(dispatch, false, channel)
          );
        }
      );
    },
    addSignalMessageToChannel: async (
      { commit, rootState, state },
      payload
    ) => {
      const { channel: signalChannel, ...signalMessage } = payload;
      logItToConsole("new message signal received", Date.now());
      // verify channel (within which the message belongs) exists
      const appChannel = state.channels.find(
        channel => channel.channel.uuid === signalChannel.channel.uuid
      );
      if (!appChannel) return;
      rootState.hcDb.elementalChat
        .get(appChannel.channel.uuid)
        .then(channel => {
          // verify message for channel does not already exist
          const messageExists = !!channel.messages.find(
            message =>
              message.message.uuid === signalMessage.message.message.uuid
          );
          console.log("messageExists", messageExists);
          if (messageExists) return;

          // if new message push to channel message list and update the channel
          console.log("received signal message : ", signalMessage);
          _addMessageToChannel(
            rootState,
            commit,
            state,
            appChannel,
            signalMessage.message
          );
        })
        .catch(error => logItToConsole(error));
    },
    addMessageToChannel: async (
      { commit, rootState, state, dispatch },
      payload
    ) => {
      logItToConsole("addMessageToChannel start", Date.now());
      const holochainPayload = {
        last_seen: payload.channel.last_seen,
        channel: payload.channel.channel,
        message: {
          ...payload.message,
          content: `${rootState.agentHandle.toUpperCase()}:
      ${payload.message.content}`
        },
        chunk: 0
      };
      callZome(dispatch, rootState, "chat", "create_message", holochainPayload)
        .then(message => {
          logItToConsole("addMessageToChannel zome done", Date.now());
          _addMessageToChannel(
            rootState,
            commit,
            state,
            state.channel,
            message
          );
          const signalMessageData = {
            messageData: message,
            channelData: payload.channel
          };
          dispatch("signalMessageSent", signalMessageData);
        })
        .catch(error => logItToConsole(error));
    },
    signalMessageSent: async ({ rootState }, payload) => {
      logItToConsole("signalMessageSent start", Date.now());
      rootState.holochainClient.callZome({
        cap: null,
        cell_id: rootState.appInterface.cellId,
        zome_name: "chat",
        fn_name: "signal_users_on_channel",
        provenance: rootState.agentKey,
        payload
      });
      logItToConsole("signalMessageSent done", Date.now());
    },
    listMessages({ commit, state, rootState, dispatch }, payload) {
      logItToConsole("listMessages start", Date.now());
      console.log("listMessages payload", payload);
      const holochainPayload = {
        channel: payload.channel.channel,
        chunk: payload.chunk,
        active_chatter: payload.active_chatter
      };
      callZome(dispatch, rootState, "chat", "list_messages", holochainPayload)
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
          if (state.channel.channel.uuid !== payload.channel.channel.uuid) {
            commit("setUnseen", payload.channel.channel.uuid);
          }
          rootState.hcDb.elementalChat
            .put(internalChannel, payload.channel.channel.uuid)
            .then(logItToConsole("put listMessages dexie done", Date.now()))
            .catch(error => logItToConsole(error));
        })
        .catch(error => logItToConsole(error));
    },
    diplayErrorMessage({ commit }, payload) {
      commit("setError", payload);
    },
    async rehydrateChannels({ dispatch, commit, rootState }) {
      dispatch("listChannels", { category: "General" });
      let channels = [];
      await rootState.hcDb.elementalChat.each(channelEntry => {
        if (channelEntry.length === 0) return;
        if (channelEntry.length > 0) {
          channelEntry.map(channel => channels.push(channel));
        } else {
          channels.push(channelEntry);
        }
      });
      const uniqueChannels = channels.reduce((acc, current) => {
        console.log(" >>", current);
        const x = acc.find(
          channel => channel.channel.uuid === current.channel.uuid
        );
        if (!x) return acc.concat([current]);
        else return acc;
      }, []);
      if (uniqueChannels.length > 0) commit("setChannels", uniqueChannels);
    },
    resetState({ commit }) {
      commit("resetState");
    }
  },
  mutations: {
    setChannel(state, payload) {
      state.channel = { ...payload };
      state.channels.map(channel => {
        if (channel.channel.uuid === payload.channel.uuid) {
          console.log("clearing unseen for ", channel);
          channel.unseen = false;
        }
      });
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
    },
    setUnseen(state, payload) {
      // find channel by uuid and update unseen when found
      state.channels.map(channel => {
        if (channel.channel.uuid === payload) {
          console.log("setting unseen for ", channel);
          channel.unseen = true;
        }
      });
    },
    resetState(state) {
      (state.channels = []),
        (state.channel = {
          info: { name: "" },
          channel: { category: "General", uuid: "" },
          messages: []
        });
    }
  }
};
