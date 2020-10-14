import { v4 as uuidv4 } from "uuid";

// function createMessage(
//   holochainClient,
//   agentKey,
//   channel,
//   last_seen,
//   agentHandle,
//   cellId,
//   index
// ) {
//   logItToConsole(channel);
//   const content = `${index} - ${agentHandle} message`;
//   const holochainPayload = {
//     last_seen: last_seen,
//     channel: channel,
//     message: {
//       uuid: uuidv4(),
//       content: content
//     }
//   };
//   holochainClient
//     .callZome({
//       cap: null,
//       cell_id: cellId,
//       zome_name: "chat",
//       fn_name: "create_message",
//       provenance: agentKey,
//       payload: holochainPayload
//     })
//     .then(commitedMessage => {
//       index++;
//       channel.last_seen = commitedMessage.entryHash;
//       logItToConsole(commitedMessage);
//       if (index < 10) {
//         createMessage(
//           holochainClient,
//           agentKey,
//           channel,
//           last_seen,
//           agentHandle,
//           cellId,
//           index
//         );
//       } else {
//         logItToConsole(new Date());
//       }
//     });
// }

function pollMessages(dispatch, channel, date) {
  dispatch("listMessages", {
    channel: channel,
    date: date
  });
}
function logItToConsole(what, time) { // eslint-disable-line
  console.log(time, what);
}
let intervalId = 0;
export default {
  namespaced: true,
  state: {
    channels: [],
    channel: {
      info: { name: "" },
      channel: { category: "General", uuid: "" },
      messages: []
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
    createChannel: async ({ commit, rootState, dispatch }, payload) => {
      logItToConsole("createChannel start", Date.now());
      const holochainPayload = {
        name: payload.info.name,
        channel: payload.channel
      };
      rootState.holochainClient
        .callZome({
          cap: null,
          cell_id: rootState.appInterface.cellId,
          zome_name: "chat",
          fn_name: "create_channel",
          provenance: rootState.agentKey,
          payload: holochainPayload
        })
        .then(committedChannel => {
          logItToConsole("createChannel zome done", Date.now());
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
        });
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
    breakIt: async ({ rootState }) => {
      logItToConsole("Start test", new Date());
      for (let i = 0; i < 10; i++) {
        const internalChannel = {
          name: `${rootState.agentHandle}-channel${i}`,
          channel: { category: "General", uuid: uuidv4() }
        };
        rootState.holochainClient
          .callZome({
            cap: null,
            cell_id: rootState.appInterface.cellId,
            zome_name: "chat",
            fn_name: "create_channel",
            provenance: rootState.agentKey,
            payload: internalChannel
          })
          .then(committedChannel => {
            logItToConsole("Channel Created:", new Date());
            logItToConsole(committedChannel);
            // createMessage(
            //   rootState.holochainClient,
            //   rootState.agentKey,
            //   committedChannel.channel,
            //   { First: null },
            //   rootState.agentHandle,
            //   rootState.appInterface.cellId,
            //   0
            // );
          });
      }
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
    }
  }
};
