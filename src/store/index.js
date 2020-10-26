import Vue from "vue";
import Vuex from "vuex";
import elementalChat from "@/applications/ElementalChat/store/elementalChat";
import { AppWebsocket } from "@holochain/conductor-api";
import dexiePlugin from "./dexiePlugin";

Vue.use(Vuex);

const HPOS_WEB_CLIENT_PORT = 443; // This is the correct port for HPOS context but it isn't used anyway.
const DNA_ALIAS = "elemental-chat";
const DOMAIN = window.location.hostname;

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

export default new Vuex.Store({
  state: {
    connectedToHolochain: false,
    needsHandle: false,
    today: { year: yyyy, month: mm, day: dd },
    agentHandle: ""
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
    initialiseAgent({ commit, state }) {
      AppWebsocket.connect(`wss://${DOMAIN}/api/v1/ws`).then(
        holochainClient => {
          console.log("holochainClient connected : ", holochainClient);
          commit("setHolochainClient", holochainClient);
          state.hcDb.agent.get("agentKey").then(agentKey => {
            console.log(agentKey);
            if (agentKey === undefined || agentKey === null) {
              holochainClient.appInfo({ app_id: DNA_ALIAS }).then(appInfo => {
                console.log("appInfo fetched : ", appInfo);
                const cellId = appInfo.cell_data[0][0];
                const agentId = cellId[1];

                commit("setAgentKey", agentId);
                commit("setAppInterface", {
                  port: HPOS_WEB_CLIENT_PORT,
                  cellId
                });

                state.hcDb.agent
                  .put(agentId, "agentKey")
                  .catch(error => console.log(error));
                state.hcDb.agent.put(
                  {
                    port: HPOS_WEB_CLIENT_PORT,
                    cellId
                  },
                  "appInterface"
                );
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
        }
      );
      state.hcDb.agent.get("agentHandle").then(agentHandle => {
        if (agentHandle === null || agentHandle === undefined) {
          commit("needsHandle", true);
        } else {
          commit("setAgentHandle", agentHandle);
        }
      });
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
