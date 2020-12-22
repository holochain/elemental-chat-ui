function pollMessages(dispatch, active_chatter, channel) {
  dispatch("listMessages", {
    channel: channel,
    chunk: { start: 0, end: 0 },
    active_chatter
  });
}

function log(action, data) { // eslint-disable-line
  console.log(Date.now(), action);
  if (data !== undefined) console.log(data);
}

function sortChannels(val) {
  val.sort((a, b) => (a.info.name > b.info.name ? 1 : -1));
  return val;
}

const doResetConnection = async dispatch => {
  return dispatch("resetConnectionState", null, { root: true });
};

export const callZome = async (
  dispatch,
  rootState,
  zome_name,
  fn_name,
  payload,
  timeout
) => {
  if (rootState.conductorDisconnected) {
    log("callZome called when disconnected from conductor");
    return;
  }
  try {
    const result = await rootState.holochainClient.callZome(
      {
        cap: null,
        cell_id: rootState.appInterface.cellId,
        zome_name,
        fn_name,
        provenance: rootState.agentKey,
        payload
      },
      timeout
    );
    return result;
  } catch (error) {
    log("ERROR: callZome threw error", error);
    if (error == "Error: Socket is not open")
      return doResetConnection(dispatch);
  }
};

function _addMessageToChannel(rootState, commit, state, channel, message) {
  // verify message for channel does not already exist
  const messageExists = !!channel.messages.find(
    m => message.message.uuid === m.message.uuid
  );
  if (messageExists) return;

  const internalMessages = [...channel.messages];
  internalMessages.push(message);
  const internalChannel = {
    ...channel,
    last_seen: { Message: message.entryHash },
    messages: internalMessages
  };

  internalMessages.sort((a, b) => a.createdAt[0] - b.createdAt[0]);

  log("got message", message);
  log(
    `adding message to the channel ${internalChannel.channel.uuid}`,
    internalChannel
  );

  // if this update was to the currently selected channel, then we
  // also have to update the state.channel object
  if (state.channel.channel.uuid == channel.channel.uuid) {
    commit("setChannel", internalChannel);
  } else {
    commit("setUnseen", channel.channel.uuid);
  }

  log("addMessageToChannel dexie start");
  rootState.hcDb.elementalChat
    .put(internalChannel, channel.channel.uuid)
    .then(log("addMessageToChannel dexie done"))
    .catch(error => log(error));
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
    stats: {},
    showStats: false,
    statsLoading: false,
    error: {
      shouldShow: false,
      message: ""
    }
  },
  actions: {
    updateHandle: async ({ rootState }) => {
      log("Updating Handle");
      rootState.needsHandle = true;
    },
    getStats: async ({ rootState, dispatch, commit }) => {
      log("Getting Stats...");
      commit("loadStats");
      callZome(
        dispatch,
        rootState,
        "chat",
        "stats",
        { category: "General" },
        60000
      )
        .then(stats => {
          log("stats zomeCall done");
          console.log(">>>>>>>>>>>>>", stats);
          commit("setStats", stats);
        })
        .catch(error => {
          log("stats zomeCall error", error);
          commit("resetStats");
        });
    },
    resetStats({ commit }) {
      commit("resetStats");
    },
    setChannel: async ({ commit, rootState, dispatch }, payload) => {
      log("setChannel start");
      log("Setting channel payload", payload);
      rootState.hcDb.elementalChat
        .get(payload.channel.uuid)
        .then(channel => {
          log("setChannel dexie done");
          if (channel === undefined) channel = payload;
          commit("setChannel", channel);
          pollMessages(dispatch, true, payload);
        })
        .catch(error => log(error));
    },
    setChannelPolling: async ({ dispatch }) => {
      clearInterval(intervalId);
      intervalId = setInterval(function() {
        dispatch("listChannels", { category: "General" });
      }, 300000); // Polling every 5mins
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
      log("new channel signal received");
      log("received channel : ", committedChannel);
      committedChannel.last_seen = { First: null };
      commit("createChannel", { ...committedChannel, messages: [] });
      rootState.hcDb.elementalChat
        .put(
          { ...committedChannel, messages: [] },
          committedChannel.channel.uuid
        )
        .then(log("createChannel dexie done"))
        .catch(error => log(error));
      dispatch("setChannel", { ...committedChannel, messages: [] });
    },
    createChannel: async ({ commit, rootState, dispatch }, payload) => {
      log("createChannel start");
      const holochainPayload = {
        name: payload.info.name,
        channel: payload.channel
      };
      callZome(
        dispatch,
        rootState,
        "chat",
        "create_channel",
        holochainPayload,
        60000
      )
        .then(committedChannel => {
          log("createChannel zome done");
          committedChannel.last_seen = { First: null };
          commit("createChannel", { ...committedChannel, messages: [] });
          log("created channel : ", committedChannel);
          rootState.hcDb.elementalChat
            .put(
              { ...committedChannel, messages: [] },
              committedChannel.channel.uuid
            )
            .then(log("createChannel dexie done"))
            .catch(error => log(error));
          dispatch("setChannel", { ...committedChannel, messages: [] });
        })
        .catch(error => log("createChannel zome error", error));
    },
    listChannels({ commit, rootState, state, dispatch }, payload) {
      log("listChannels start");
      rootState.hcDb.elementalChat.get(payload.category).then(channels => {
        if (channels === undefined) return;
        commit("setChannels", channels);
      });
      log("listChannels zome start");
      callZome(dispatch, rootState, "chat", "list_channels", payload, 30000)
        .then(async result => {
          log("listChannels zome done");

          if (!result) {
            log("listChannels zome returned undefined");
          } else {
            commit("setChannels", result.channels);
            log("put listChannels dexie start");
            let hcDBState =
              (await rootState.hcDb.elementalChat.get("General")) || [];
            let newChannels = [];
            newChannels = result.channels.filter(channel => {
              return !hcDBState.find(
                c => c.channel.uuid == channel.channel.uuid
              );
            });
            let sortedChannels = sortChannels(result.channels);
            rootState.hcDb.elementalChat
              .put(sortedChannels, payload.category)
              .then(log("put listChannels dexie done"))
              .catch(error => log(error));
            log("SETTING channels in indexDb : ", result.channels);

            if (state.channel.info.name === "" && result.channels.length > 0)
              dispatch("setChannel", { ...result.channels[0], messages: [] });

            // Get messages for the newChannels without active_chatter
            newChannels.forEach(channel =>
              pollMessages(dispatch, false, channel)
            );
          }
        })
        .catch(error => log("listChannels zome error", error));
    },
    addSignalMessageToChannel: async (
      { commit, rootState, state },
      payload
    ) => {
      const { channel: signalChannel, ...signalMessage } = payload;
      log("new message signal received");
      // verify channel (within which the message belongs) exists
      const appChannel = state.channels.find(
        channel => channel.channel.uuid === signalChannel.channel.uuid
      );
      if (!appChannel) return;
      rootState.hcDb.elementalChat
        .get(appChannel.channel.uuid)
        .then(channel => {
          // if new message push to channel message list and update the channel
          log("received signal message : ", signalMessage);
          _addMessageToChannel(
            rootState,
            commit,
            state,
            channel,
            signalMessage.message
          );
        })
        .catch(error => log(error));
    },
    addMessageToChannel: async (
      { commit, rootState, state, dispatch },
      payload
    ) => {
      log("addMessageToChannel start");
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
      callZome(
        dispatch,
        rootState,
        "chat",
        "create_message",
        holochainPayload,
        60000
      )
        .then(message => {
          log("addMessageToChannel zome done");
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
        .catch(error => log("addMessageToChannel zome error:", error));
    },
    signalMessageSent: async ({ rootState }, payload) => {
      log("signalMessageSent start");
      rootState.holochainClient
        .callZome(
          {
            cap: null,
            cell_id: rootState.appInterface.cellId,
            zome_name: "chat",
            fn_name: "signal_chatters",
            provenance: rootState.agentKey,
            payload
          },
          60000
        )
        .then(result => {
          log(`signalMessageSent zome done`, result);
        })
        .catch(error => log("signalMessageSent zome error:", error));
    },
    async listMessages({ commit, state, rootState, dispatch }, payload) {
      log("listMessages start");
      log("listMessages payload", payload);
      const holochainPayload = {
        channel: payload.channel.channel,
        chunk: payload.chunk,
        active_chatter: payload.active_chatter
      };
      const channel = await rootState.hcDb.elementalChat.get(
        payload.channel.channel.uuid
      );

      callZome(
        dispatch,
        rootState,
        "chat",
        "list_messages",
        holochainPayload,
        30000
      )
        .then(result => {
          log("listMessages zome done");
          payload.channel.last_seen = { First: null };
          if (result.messages.length > 0) {
            payload.channel.last_seen = {
              Message: result.messages[result.messages.length - 1].entryHash
            };
          }

          result.messages.sort((a, b) => a.createdAt[0] - b.createdAt[0]);

          const internalChannel = {
            ...payload.channel,
            messages: result.messages
          };
          commit("setChannelMessages", internalChannel);
          log("put listMessages dexie start");
          if (state.channel.channel.uuid !== payload.channel.channel.uuid) {
            if (result.messages.length > 0)
              if (channel === undefined || channel.messages === undefined) {
                commit("setUnseen", payload.channel.channel.uuid);
              } else {
                let newMessages = result.messages.filter(message => {
                  return !channel.messages.find(
                    c => c.message.uuid == message.message.uuid
                  );
                });
                if (newMessages.length > 0) {
                  commit("setUnseen", payload.channel.channel.uuid);
                }
              }
          }
          rootState.hcDb.elementalChat
            .put(internalChannel, payload.channel.channel.uuid)
            .then(log("put listMessages dexie done"))
            .catch(error => log(error));
        })
        .catch(error => log("listMessages zome done", error));
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
    },
    refreshChatter({ dispatch, rootState }) {
      log("refreshChatter start");
      callZome(dispatch, rootState, "chat", "refresh_chatter", null, 30000)
        .then(() => {
          log("refreshChatter zome done");
        })
        .catch(error => log("refreshChatter zome error", error));
    }
  },
  mutations: {
    setChannel(state, payload) {
      log("setChannel payload", payload);
      state.channel = { ...payload };
      state.channels.map(channel => {
        if (channel.channel.uuid === payload.channel.uuid) {
          log("clearing unseen for ", channel);
          channel.unseen = false;
        }
      });
    },
    setChannels(state, payload) {
      payload.map(channel => {
        let found = state.channels.find(
          c => c.channel.uuid === channel.channel.uuid
        );
        if (found) {
          channel.unseen = found.unseen;
        }
        return channel;
      });

      state.channels = sortChannels(payload);
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
      let channels = state.channels;
      channels.push(payload);
      state.channels = sortChannels(channels);
    },
    setError(state, payload) {
      state.error = payload;
    },
    setUnseen(state, payload) {
      // find channel by uuid and update unseen when found
      state.channels.map(channel => {
        if (channel.channel.uuid === payload) {
          log("setting unseen for ", channel);
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
    },
    loadStats(state) {
      state.showStats = true;
      state.statsLoading = true;
    },
    setStats(state, payload) {
      state.showStats = true;
      state.statsLoading = false;
      state.stats.agents = payload.agents;
      state.stats.active = payload.active;
      state.stats.channels = payload.channels;
      state.stats.messages = payload.messages;
    },
    resetStats(state) {
      state.showStats = undefined;
      state.statsLoading = undefined;
    }
  }
};
