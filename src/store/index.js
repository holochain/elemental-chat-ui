import Vue from "vue";
import Vuex from "vuex";
import elementalChat from "@/applications/ElementalChat/store/elementalChat";
import { AppWebsocket } from "@holochain/conductor-api";
import dexiePlugin from "./dexiePlugin";
import { arrayBufferToBase64 } from "./utils";

Vue.use(Vuex);

const RECONNECT_SECONDS = 15;

const APP_VERSION = process.env.VUE_APP_UI_VERSION;

const INSTALLED_APP_ID =
  // for development/testing: dev agent 1 is served at port 8888, and dev agent 2 at port 9999
  process.env.VUE_APP_WEB_CLIENT_PORT === "8888"
    ? "elemental-chat-1"
    : process.env.VUE_APP_WEB_CLIENT_PORT === "9999"
    ? "elemental-chat-2"
    : "elemental-chat:alpha2"; // default to elemental-chat:<dna version number> (appId format for holo self-hosted)

const WEB_CLIENT_PORT = process.env.VUE_APP_WEB_CLIENT_PORT || 8888;

const WEB_CLIENT_URI =
  process.env.VUE_APP_CONTEXT === "holo-host"
    ? `wss://${window.location.hostname}/api/v1/ws/`
    : `ws://localhost:${WEB_CLIENT_PORT}`;

console.log(
  "process.env.NODE_ENV === 'development' : ",
  process.env.NODE_ENV === "development"
);
console.log("process.env.VUE_APP_CONTEXT : ", process.env.VUE_APP_CONTEXT);
console.log("INSTALLED_APP_ID : ", INSTALLED_APP_ID);
console.log("WEB_CLIENT_URI : ", WEB_CLIENT_URI);

(function() {
  if ("File" in self) {
    File.prototype.arrayBuffer = File.prototype.arrayBuffer || myArrayBuffer;
  }
  Blob.prototype.arrayBuffer = Blob.prototype.arrayBuffer || myArrayBuffer;

  function myArrayBuffer() {
    // this: File or Blob
    return new Promise(resolve => {
      let fr = new FileReader();
      fr.onload = () => {
        resolve(fr.result);
      };
      fr.readAsArrayBuffer(this);
    });
  }
})();

const manageSignals = (signal, dispatch) => {
  console.log("incoming signal");
  const signalData = signal.data.payload;
  const { signal_name: signalName, signal_payload: signalPayload } = signalData;
  switch (signalName) {
    case "message":
      console.log("INCOMING SIGNAL > NEW MESSAGE");
      console.log("payload" + JSON.stringify(signalPayload));
      // trigger action in elemental_chat to add message to message list
      dispatch("elementalChat/addSignalMessageToChannel", {
        channel: signalPayload.SignalMessageData.channelData,
        message: signalPayload.SignalMessageData.messageData
      });
      break;
    case "channel":
      console.log("INCOMING SIGNAL > NEW CHANNEL");
      // TODO: Implement channel signals
      // trigger action in elemental_chat module to add channel to channel list
      // dispatch("elementalChat/addSignalChannel", signalPayload.ChannelData);
      break;
    default:
      throw new Error("Received an unsupported signal by name : ", name);
  }
};

const initializeApp = (commit, dispatch, state) => {
  AppWebsocket.connect(WEB_CLIENT_URI, signal =>
    manageSignals(signal, dispatch)
  )
    .then(holochainClient => {
      holochainClient
        .appInfo({ installed_app_id: INSTALLED_APP_ID })
        .then(appInfo => {
          console.log("appInfo : ", appInfo);
          const cellId = appInfo.cell_data[0][0];
          const dnaHash = arrayBufferToBase64(cellId[0]);
          console.log("cellId : ", dnaHash, arrayBufferToBase64(cellId[1]));

          state.hcDb.agent.get("dnaHash").then(storedDnaHash => {
            console.log("dna from index DB : ", storedDnaHash);
            if (
              storedDnaHash === null ||
              storedDnaHash === undefined ||
              storedDnaHash === ""
            ) {
              state.hcDb.agent.put(dnaHash, "dnaHash");
            } else {
              if (dnaHash != storedDnaHash) {
                commit("contentReset");
                dispatch("elementalChat/resetState");
              }
              state.hcDb.agent.put(dnaHash, "dnaHash");
            }
          });

          const agentId = cellId[1];
          console.log("agent key : ", arrayBufferToBase64(agentId));
          commit("setAgentKey", agentId);
          commit("setAppInterface", {
            port: WEB_CLIENT_PORT,
            appId: INSTALLED_APP_ID,
            cellId,
            appVersion: APP_VERSION
          });
          commit("setHolochainClient", holochainClient);
        });
      holochainClient.onclose = function(e) {
        // whenever we disconnect from conductor (in dev setup - running 'holochain-run-dna'),
        // we create new keys... therefore the identity shouold not be held inbetween sessions
        commit("resetConnectionState");
        console.log(
          `Socket is closed. Reconnect will be attempted in ${RECONNECT_SECONDS} seconds.`,
          e.reason
        );
        commit("setReconnecting", RECONNECT_SECONDS);
      };
    })
    .catch(error => {
      console.log("Connection Error ", error);
      commit("setReconnecting", RECONNECT_SECONDS);
    });
};

function conductorConnected(state) {
  return state.reconnectingIn === -1;
}
/*
function conductorConnecting(state) {
  return state.reconnectingIn ===  0;
}*/

function conductorInBackoff(state) {
  return state.reconnectingIn > 0;
}

export default new Vuex.Store({
  state: {
    holochainClient: null,
    conductorDisconnected: true,
    reconnectingIn: 0,
    needsHandle: false,
    agentHandle: "",
    appInterface: null,
    firstConnect: true
  },
  mutations: {
    setAgentKey(state, payload) {
      state.agentKey = payload;
    },
    needsHandle(state, payload) {
      state.needsHandle = payload;
    },
    setAgentHandle(state, payload) {
      state.agentHandle = payload;
      state.needsHandle = false;
    },
    setAppInterface(state, payload) {
      state.appInterface = payload;
    },
    setReconnecting(state, payload) {
      state.firstConnect = false;
      state.reconnectingIn = payload;
    },
    setHolochainClient(state, payload) {
      console.log("holochainClient connected", payload);
      state.holochainClient = payload;
      state.conductorDisconnected = false;
      state.reconnectingIn = -1;
      state.firstConnect = false;
    },
    contentReset(state) {
      console.log("CONTENT RESET (DNA CHANGED)");
      state.hcDb.agent.put("", "agentHandle");
      state.hcDb.elementalChat.clear();
      state.needsHandle = true;
      state.agentHandle = "";
    },
    resetConnectionState(state) {
      console.log("RESETTING CONNECTION STATE");
      state.holochainClient = null;
      state.conductorDisconnected = true;
      state.reconnectingIn = RECONNECT_SECONDS;
      state.appInterface = null;
    }
  },
  actions: {
    initialiseStore({ commit, state, dispatch }) {
      state.hcDb.version(1).stores({
        agent: "",
        elementalChat: ""
      });
      dispatch("initialiseAgent");
      setInterval(function() {
        if (!conductorConnected(state)) {
          if (conductorInBackoff(state)) {
            commit("setReconnecting", state.reconnectingIn - 1);
          } else {
            dispatch("initialiseAgent");
          }
        }
      }, 1000);
    },
    initialiseAgent({ commit, dispatch, state }) {
      state.hcDb.agent.get("agentHandle").then(agentHandle => {
        if (
          agentHandle === null ||
          agentHandle === undefined ||
          agentHandle === ""
        ) {
          commit("needsHandle", true);
        } else {
          commit("setAgentHandle", agentHandle);
        }
      });
      initializeApp(commit, dispatch, state);
    },
    setAgentHandle({ commit, state }, payload) {
      commit("setAgentHandle", payload);
      state.hcDb.agent.put(payload, "agentHandle");
    },
    skipBackoff({ commit }) {
      commit("setReconnecting", 0);
    },
    resetConnectionState({ commit }) {
      commit("resetConnectionState");
    }
  },
  modules: {
    elementalChat
  },
  plugins: [dexiePlugin]
});
