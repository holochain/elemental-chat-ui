import { isHoloHosted, toUint8Array } from "@/utils";

function pollMessages(dispatch, active_chatter, channel) {
  dispatch("listMessages", {
    channel: channel,
    chunk: { start: 0, end: 0 },
    active_chatter
  });
}

function log(action, data) {
  // eslint-disable-line
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

const callZomeHolo = (_, rootState, zome_name, fn_name, payload) => {
  return rootState.holoClient.zomeCall(
    "elemental-chat", // this dna_alias should be whatever is set in HHA
    zome_name,
    fn_name,
    payload
  );
};

const callZomeLocal = async (
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
    if (error == "Error: Socket is not open") {
      return doResetConnection(dispatch);
    }
  }
};

const callZome = isHoloHosted() ? callZomeHolo : callZomeLocal;

let listChannelsIntervalId = 0;
let pollMessagesIntervalId = 0;

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
    getStats: async ({ state, rootState, dispatch, commit }) => {
      log("Getting Stats...");
      commit("loadStats");
      callZome(dispatch, rootState, "chat", "agent_stats", null, 60000)
        .then(async stats => {
          log("stats zomeCall done");
          log("Peer stats: ", stats);
          let channels = 0;
          let messages = 0;
          await rootState.hcDb.elementalChat.get("General").then(async c => {
            if (c === undefined) channels = 0;
            else channels = c.length;
            for (let i = 0; i < c.length; i++) {
              await rootState.hcDb.elementalChat
                .get(c[i].channel.uuid)
                .then(m => {
                  if (m !== undefined && m.messages !== undefined) {
                    messages += m.messages.length;
                  }
                });
            }
          });
          channels =
            channels > state.channels ? channels : state.channels.length;
          log("Total stats: ", { channels, messages, ...stats });
          commit("setStats", { channels, messages, ...stats });
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
          clearInterval(pollMessagesIntervalId);
          pollMessagesIntervalId = setInterval(() => {
            pollMessages(dispatch, true, payload);
          }, 60000);
        })
        .catch(error => log(error));
    },
    setChannelPolling: async ({ dispatch }) => {
      clearInterval(listChannelsIntervalId);
      listChannelsIntervalId = setInterval(function() {
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
            const hcDBState =
              (await rootState.hcDb.elementalChat.get("General")) || [];
            let newChannels = [];
            newChannels = result.channels.filter(channel => {
              return !hcDBState.find(
                c => c.channel.uuid == channel.channel.uuid
              );
            });
            const sortedChannels = sortChannels(result.channels);
            rootState.hcDb.elementalChat
              .put(sortedChannels, payload.category)
              .then(log("put listChannels dexie done"))
              .catch(error => log(error));
            log("SETTING channels in indexDb : ", result.channels);

            if (state.channel.info.name === "" && result.channels.length > 0) {
              dispatch("setChannel", { ...result.channels[0], messages: [] });
            }

            // Get messages for the newChannels without active_chatter
            newChannels.forEach(channel =>
              pollMessages(dispatch, false, channel)
            );
          }
        })
        .catch(error => log("listChannels zome error", error));
    },
    addSignalMessageToChannel: async ({ commit }, payload) => {
      log("adding signal message: ", payload);
      commit("addMessageToChannel", {
        channel: payload.channelData,
        message: payload.messageData
      });
    },
    addMessageToChannel: async (
      { commit, rootState, state, dispatch },
      payload
    ) => {
      log("addMessageToChannel start");
      let last_seen = payload.channel.last_seen;
      if (payload.channel.last_seen.Message) {
        last_seen = {
          Message: toUint8Array(payload.channel.last_seen.Message)
        };
      }
      const holochainPayload = {
        last_seen,
        channel: payload.channel.channel,
        message: {
          ...payload.message,
          content: `${rootState.agentHandle.toUpperCase()}:
      ${payload.message.content}`
        },
        chunk: 0
      };
      log("addMessageToChannel start", holochainPayload);
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
          commit("addMessageToChannel", { channel: state.channel, message });

          console.log("MESSAGE:", message);

          console.log("CHANNEL:", payload.channel);

          message["entryHash"] = toUint8Array(message["entryHash"]);
          message["createdBy"] = toUint8Array(message["createdBy"]);
          const channel = payload.channel;
          channel.info["created_by"] = toUint8Array(channel.info["created_by"]);
          const signalMessageData = {
            messageData: message,
            channelData: channel
          };
          log("sending signalMessages", signalMessageData);
          dispatch("signalMessageSent", signalMessageData);
        })
        .catch(error => log("addMessageToChannel zome error:", error));
    },
    signalMessageSent: async ({ rootState, dispatch }, payload) => {
      log("signalMessageSent start");
      callZome(dispatch, rootState, "chat", "signal_chatters", payload, 60000)
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
      const uuid = payload.channel.channel.uuid;
      const channel = await rootState.hcDb.elementalChat.get(uuid);
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
            const data = toUint8Array(
              result.messages[result.messages.length - 1].entryHash
            );
            payload.channel.last_seen = {
              Message: data
            };
          }

          let signalMessages = [];
          let newMessages = [];

          if (!(channel === undefined || channel.messages === undefined)) {
            // messages in new that aren't in old
            newMessages = result.messages.filter(message => {
              return !channel.messages.find(
                c => c.message.uuid == message.message.uuid
              );
            });

            // messages in old that aren't in new are ones that arrived as signals
            signalMessages = channel.messages.filter(message => {
              return !result.messages.find(
                c => c.message.uuid == message.message.uuid
              );
            });
          }

          const messages = [...result.messages, ...signalMessages];

          messages.sort((a, b) => a.createdAt[0] - b.createdAt[0]);

          const internalChannel = {
            ...payload.channel,
            messages
          };

          commit("setChannelMessages", internalChannel);
          log("put listMessages dexie start");

          if (state.channel.channel.uuid !== uuid) {
            if (result.messages.length > 0) {
              if (channel === undefined || channel.messages === undefined) {
                commit("setUnseen", uuid);
              } else {
                if (newMessages.length > 0) {
                  commit("setUnseen", uuid);
                }
              }
            }
          }
          rootState.hcDb.elementalChat
            .put(internalChannel, uuid)
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
      const channels = [];
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
    addMessageToChannel(state, payload) {
      const { channel, message } = payload;

      // verify channel (within which the message belongs) exists
      const appChannel = state.channels.find(
        c => c.channel.uuid === channel.channel.uuid
      );
      if (!appChannel) return;

      if (appChannel.messages === undefined) {
        appChannel.messages = [];
      }

      // verify message for channel does not already exist
      const messageExists = !!appChannel.messages.find(
        m => message.message.uuid === m.message.uuid
      );
      if (messageExists) return;

      appChannel.messages.push(message);
      appChannel.messages.sort((a, b) => a.createdAt[0] - b.createdAt[0]);

      log("got message", message);
      log(
        `adding message to the channel ${appChannel.channel.uuid}`,
        appChannel
      );

      state.channels = state.channels.map(c => {
        if (c.channel.uuid === channel.channel.uuid) {
          return appChannel;
        } else {
          return c;
        }
      });

      // if this update was to the currently selected channel, then we
      // also have to update the state.channel object
      if (state.channel.channel.uuid == appChannel.channel.uuid) {
        const internalChannel = {
          ...appChannel,
          last_seen: { Message: message.entryHash }
        };
        _setChannel(state, internalChannel);
      } else {
        _setUnseen(state, channel.channel.uuid);
      }
    },
    setChannel(state, payload) {
      _setChannel(state, payload);
    },
    setChannels(state, payload) {
      payload.map(channel => {
        const found = state.channels.find(
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
      console.log("setting payload", payload);
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
      const channels = state.channels;
      channels.push(payload);
      state.channels = sortChannels(channels);
    },
    setError(state, payload) {
      state.error = payload;
    },
    setUnseen(state, payload) {
      _setUnseen(state, payload);
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

function _setUnseen(state, uuid) {
  // find channel by uuid and update unseen when found
  state.channels.map(channel => {
    if (channel.channel.uuid === uuid) {
      log("setting unseen for ", channel);
      channel.unseen = true;
    }
  });
}

function _setChannel(state, payload) {
  log("setChannel payload", payload);
  state.channel = { ...payload };
  state.channels.map(channel => {
    if (channel.channel.uuid === payload.channel.uuid) {
      log("clearing unseen for ", channel);
      channel.unseen = false;
    }
  });
}
