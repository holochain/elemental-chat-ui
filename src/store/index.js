import Vue from "vue";
import Vuex from "vuex";
import elementalChat from "@/applications/ElementalChat/store/elementalChat";
import { AppWebsocket } from "@holochain/conductor-api";
import dexiePlugin from "./dexiePlugin";
import waitUntil from "async-wait-until";

Vue.use(Vuex);

const INSTALLED_APP_ID =
  // for development/testing: dev agent 1 is served at port 8888, and dev agent 2 at port 9999
  process.env.VUE_APP_WEB_CLIENT_PORT === "8888"
    ? "elemental-chat-1"
    : process.env.VUE_APP_WEB_CLIENT_PORT === "9999"
    ? "elemental-chat-2"
    : "elemental-chat:alpha1"; // default to elemental-chat:<dna version number> (appId format for holo self-hosted)

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

const today = new Date();
const dd = String(today.getUTCDate());
const mm = String(today.getUTCMonth() + 1); //January is 0!
const yyyy = String(today.getUTCFullYear());

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

const connectionReady = async webClient => {
  await waitUntil(() => webClient !== null, 30000, 100);
  console.log("holochainClient : ", webClient);
  return webClient;
};

const initializeApp = (commit, dispatch) => {
  commit("setAppInterface", {
    port: WEB_CLIENT_PORT,
    appId: INSTALLED_APP_ID,
    cellId: "mock-id"
  });
  AppWebsocket.connect(WEB_CLIENT_URI).then(holochainClient => {
    holochainClient
      .appInfo({ installed_app_id: INSTALLED_APP_ID })
      .then(appInfo => {
        console.log("appInfo : ", appInfo);
        const cellId = appInfo.cell_data[0][0];
        console.log("cellId : ", cellId);
        const agentId = cellId[1];
        console.log("agent key : ", agentId);
        commit("setAgentKey", agentId);
        commit("setAppInterface", {
          port: WEB_CLIENT_PORT,
          appId: INSTALLED_APP_ID,
          cellId
        });
      });
    holochainClient.onclose = function(e) {
      // whenever we disconnect from conductor (in dev setup - running 'holochain-run-dna'),
      // we create new keys... therefore the identity shouold not be held inbetween sessions
      commit("resetState");
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        e.reason
      );
      setTimeout(function() {
        dispatch("initialiseAgent");
      }, 1000);
    };
    console.log("holochainClient connected");
    commit("setHolochainClient", holochainClient);
  });
};

export default new Vuex.Store({
  state: {
    holochainClient: null,
    connectedToHolochain: false,
    needsHandle: false,
    today: { year: yyyy, month: mm, day: dd },
    agentHandle: "",
    appInterface: null
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
    setHolochainClient(state, payload) {
      state.holochainClient = payload;
      state.connectedToHolochain = true;
    },
    resetState(state) {
      console.log("RESETTING STATE");
      state.hcDb.agent.put("", "agentHandle");
      state.agentHandle = "";
      state.holochainClient = null;
      state.connectedToHolochain = false;
      state.needsHandle = true;
      state.appInterface = null;
    }
  },
  actions: {
    initialiseStore({ state, dispatch }) {
      state.hcDb.version(1).stores({
        agent: "",
        elementalChat: ""
      });
      dispatch("initialiseAgent");
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
      // ensure we're connected before finishing init (...starting zome calls)
      connectionReady(state.holochainClient);
    },
    setAgentHandle({ commit, state }, payload) {
      commit("setAgentHandle", payload);
      state.hcDb.agent.put(payload, "agentHandle");
    }
  },
  modules: {
    elementalChat
  },
  plugins: [dexiePlugin]
});
