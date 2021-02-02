import Vue from "vue";
import Vuex from "vuex";
import { AppWebsocket } from "@holochain/conductor-api";
import { Connection as WebSdkConnection } from "@holo-host/web-sdk";
import { isHoloHosted, isHoloSelfHosted } from "@/utils";
import elementalChat from "@/applications/ElementalChat/store/elementalChat";

import dexiePlugin from "./dexiePlugin";
import { arrayBufferToBase64 } from "./utils";

// We can't store the webSdkConnection object directly in vuex, so store this wrapper instead
function createHoloClient(webSdkConnection) {
  return {
    signIn: (...args) => webSdkConnection.signIn(...args),
    signOut: (...args) => webSdkConnection.signOut(...args),
    appInfo: (...args) => webSdkConnection.appInfo(...args),
    ready: (...args) => webSdkConnection.ready(...args),
    zomeCall: (...args) => webSdkConnection.zomeCall(...args)
  };
}

Vue.use(Vuex);

const RECONNECT_SECONDS = 15;

const APP_VERSION = process.env.VUE_APP_UI_VERSION;

const DNA_VERSION = "alpha19";
const DNA_UUID = "0001";

const INSTALLED_APP_ID =
  // for development/testing: dev agent 1 is served at port 8888, and dev agent 2 at port 9999
  process.env.VUE_APP_WEB_CLIENT_PORT === "8888"
    ? "elemental-chat-1"
    : process.env.VUE_APP_WEB_CLIENT_PORT === "9999"
    ? "elemental-chat-2"
    : `elemental-chat:${DNA_VERSION}${DNA_UUID ? ":" + DNA_UUID : ""}`; // default to elemental-chat:<dna version number>:<uuid> (appId format for holo self-hosted)

const WEB_CLIENT_PORT = process.env.VUE_APP_WEB_CLIENT_PORT || 8888;

const WEB_CLIENT_URI =
  isHoloHosted() || isHoloSelfHosted()
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

let signalQueue = [];
let signalInterval;

const wait = (amount = 0) =>
  new Promise(resolve => setTimeout(resolve, amount));

const manageSignals = (signal, dispatch) => {
  console.log("Incoming signal");
  const signalData = signal.data.payload;
  const { signal_name: signalName, signal_payload: signalPayload } = signalData;
  switch (signalName) {
    case "Message":
      console.log("INCOMING SIGNAL > NEW MESSAGE");
      console.log("payload" + JSON.stringify(signalPayload));

      // setup async ui update to avoid signals getting lost.
      if (!signalInterval) {
        signalInterval = setInterval(async () => {
          const signalPayloads = signalQueue.slice();
          signalQueue = [];

          // signalPayloads.forEach(async signalPayload => {
          for (let i = 0; i < signalPayloads.length; i++) {
            // trigger action in elemental_chat to add message to message list
            const signalPayload = signalPayloads[i];
            dispatch("elementalChat/addSignalMessageToChannel", {
              channel: signalPayload.channelData,
              message: signalPayload.messageData
            });
            await wait(100);
          }
        }, 500);
      }

      signalQueue.push(signalPayload);
      break;
    case "Channel":
      console.log("INCOMING SIGNAL > NEW CHANNEL");
      // TODO: Implement channel signals
      // trigger action in elemental_chat module to add channel to channel list
      // dispatch("elementalChat/addSignalChannel", signalPayload.ChannelData);
      break;
    default:
      throw new Error("Received an unsupported signal by name : ", name);
  }
};

const clearStateIfDnaChanged = (appInfo, commit, dispatch, state) => {
  const cellId = appInfo.cell_data[0][0];
  const dnaHash = arrayBufferToBase64(cellId[0]);
  console.log("cellId : ", dnaHash, arrayBufferToBase64(cellId[1]));

  state.hcDb.agent.get("dnaHash").then(storedDnaHash => {
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
};

let isInitializingHolo = false;
const initializeAppHolo = async (commit, dispatch, state) => {
  if (isInitializingHolo) return;
  isInitializingHolo = true;
  let holoClient;

  if (!state.holoClient) {
    const webSdkConnection = new WebSdkConnection(
      process.env.VUE_APP_CHAPERONE_SERVER_URL
    );
    holoClient = createHoloClient(webSdkConnection);
    commit("setHoloClient", holoClient);
  } else {
    holoClient = state.holoClient;
  }

  try {
    await holoClient.ready();
  } catch (e) {
    commit("setIsChaperoneDisconnected", true);
    return;
  }

  if (!state.isHoloSignedIn) {
    try {
      await holoClient.signIn();
      commit("setIsHoloSignedIn", true);
    } catch (e) {
      commit("setIsChaperoneDisconnected", true);
      return;
    }
  }

  const appInfo = await holoClient.appInfo();

  clearStateIfDnaChanged(appInfo, commit, dispatch, state);

  isInitializingHolo = false;
};

const initializeAppLocal = (commit, dispatch, state) => {
  AppWebsocket.connect(WEB_CLIENT_URI, signal =>
    manageSignals(signal, dispatch)
  )
    .then(holochainClient => {
      holochainClient
        .appInfo({
          installed_app_id: INSTALLED_APP_ID
        })
        .then(appInfo => {
          clearStateIfDnaChanged(appInfo, commit, dispatch, state);

          const cellId = appInfo.cell_data[0][0];
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
          dispatch("elementalChat/refreshChatter");
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

const initializeApp = isHoloHosted() ? initializeAppHolo : initializeAppLocal;

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
    holoClient: null,
    isHoloSignedIn: false,
    isChaperoneDisconnected: false,
    conductorDisconnected: true,
    reconnectingIn: 0,
    needsHandle: false,
    agentHandle: "",
    appInterface: null,
    firstConnect: false
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
      state.holochainClient = payload;
      state.conductorDisconnected = false;
      state.reconnectingIn = -1;
      state.firstConnect = false;
    },
    setHoloClient(state, payload) {
      state.holoClient = payload;
      state.conductorDisconnected = false;
      state.reconnectingIn = -1;
      state.firstConnect = false;
    },
    setIsHoloSignedIn(state, payload) {
      state.isHoloSignedIn = payload;
    },
    setIsChaperoneDisconnected(state, payload) {
      state.isChaperoneDisconnected = payload;
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
      state.holoClient = null;
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
      // refresh chatter state every 2 hours
      setInterval(function() {
        if (conductorConnected(state)) {
          dispatch("elementalChat/refreshChatter");
        }
      }, 1000 * 60 * 60 * 2);
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
    },
    async holoLogout({ rootState, commit, dispatch }) {
      if (rootState.holoClient) {
        await rootState.holoClient.signOut();
      }
      commit("setIsHoloSignedIn", false);
      commit("contentReset");
      dispatch("elementalChat/resetState");
      dispatch("initialiseAgent");
    }
  },
  modules: {
    elementalChat
  },
  plugins: [dexiePlugin]
});
