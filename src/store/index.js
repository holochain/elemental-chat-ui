import Vue from "vue";
import Vuex from "vuex";
import elementalChat from "@/applications/ElementalChat/store/elementalChat";
import { AppWebsocket } from "@holochain/conductor-api"; // AdminWebsocket
import dexiePlugin from "./dexiePlugin";
import waitUntil from "async-wait-until";

Vue.use(Vuex);

// const ADMIN_PORT = 4444
const APP_ID =
  // for development/testing: dev agent 1 is served at port 8888, and dev agent 2 at port 9999
  process.env.VUE_APP_WEB_CLIENT_PORT === "8888"
    ? "elemental-chat-1"
    : process.env.VUE_APP_WEB_CLIENT_PORT === "9999"
    ? "elemental-chat-2"
    : "elemental-chat"; // default to elemental-chat

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
console.log("APP_ID : ", APP_ID);
console.log("WEB_CLIENT_URI : ", WEB_CLIENT_URI);

const connectionReady = async webClient => {
  await waitUntil(() => webClient !== null, 30000, 100);
  return webClient;
};

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

const resetState = state => {
  state.hcDb.agent.put(null, "agentKey");
  state.hcDb.agent.put("", "agentHandle");
  // should we keep record of the port we are on or not...,
  // if we don't we could run into io error/ port already in use... etc.
  state.hcDb.agent.put({ port: null, cellId: null }, "appInterface");

  state.holochainClient = null;
  state.connectedToHolochain = false;
  state.needsHandle = true;
  state.agentHandle = "";
  state.appInterface = null;
};

const initializeApp = (commit, dispatch, state) => {
  AppWebsocket.connect(WEB_CLIENT_URI).then(holochainClient => {
    state.hcDb.agent.get("agentKey").then(agentKey => {
      console.log("agent key : ", agentKey);
      if (agentKey === undefined || agentKey === null) {
        holochainClient.appInfo({ app_id: APP_ID }).then(appInfo => {
          console.log("appInfo : ", appInfo);
          const cellId = appInfo.cell_data[0][0];
          const agentId = cellId[1];

          commit("setAgentKey", agentId);
          commit("setAppInterface", {
            port: WEB_CLIENT_PORT,
            cellId
          });

          state.hcDb.agent
            .put(agentId, "agentKey")
            .catch(error => console.log(error));
          state.hcDb.agent
            .put(
              {
                port: WEB_CLIENT_PORT,
                cellId
              },
              "appInterface"
            )
            .catch(error => console.log(error));
        });
      } else {
        commit("setAgentKey", agentKey);
        state.hcDb.agent.get("appInterface").then(appInterface => {
          commit("setAppInterface", {
            port: appInterface.port,
            cellId: appInterface.cellId
          });
        });
      }
    });
    holochainClient.onclose = function(e) {
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        e.reason
      );
      // whenever we disconnect from conductor (in dev setup - running 'holochain-run-dna'),
      // we create new keys... therefore the identity shouold not be held inbetween sessions
      resetState();
      setTimeout(function() {
        dispatch("initialiseAgent");
      }, 1000);
    };
    console.log("holochainClient connected : ", holochainClient);
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
      // if (process.env.VUE_APP_CONTEXT === "holochain") {
      //   AdminWebsocket.connect(`ws://localhost:${ADMIN_PORT}`).then(admin => {
      //     console.log("ADMIN : ", admin);

      //     // Q: would this attach a new interface everytime?
      //     admin.attachAppInterface({ port: 0 }).then(appInterface => {
      //       console.log("New App Interface : ", appInterface);
      //       console.log("Attached New App Interface at : ", appInterface.port);
      //       initializeApp(commit, dispatch, state, appInterface.port)
      //     });
      //   })
      // } else {
      initializeApp(commit, dispatch, state);
      // }
      state.hcDb.agent.get("agentHandle").then(agentHandle => {
        if (agentHandle === null || agentHandle === undefined) {
          commit("needsHandle", true);
        } else {
          commit("setAgentHandle", agentHandle);
        }
      });
    },
    setAgentHandle({ commit, state }, payload) {
      connectionReady(state.holochainClient);
      commit("setAgentHandle", payload);
      state.hcDb.agent.put(payload, "agentHandle");
    }
  },
  modules: {
    elementalChat
  },
  plugins: [dexiePlugin]
});
