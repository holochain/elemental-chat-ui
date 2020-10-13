import Vue from "vue";
import Vuex from "vuex";
import elementalChat from "@/applications/ElementalChat/store/elementalChat";
import { AdminWebsocket, AppWebsocket } from "@holochain/conductor-api";

Vue.use(Vuex);
const ADMIN_PORT = 3301;
const APP_ID = "ElementalChat";
const today = new Date();
const dd = String(today.getUTCDate());
const mm = String(today.getUTCMonth() + 1); //January is 0!
const yyyy = String(today.getUTCFullYear());
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
      state.hcDb.agent.get("agentKey").then(agentKey => {
        console.log(agentKey);
        if (agentKey === undefined || agentKey === null) {
          AdminWebsocket.connect(`ws://localhost:${ADMIN_PORT}`).then(admin => {
            admin.generateAgentPubKey().then(agentKey => {
              commit("setAgentKey", agentKey);
              state.hcDb.agent
                .put(agentKey, "agentKey")
                .catch(error => console.log(error));
              admin
                .installApp({
                  app_id: APP_ID,
                  agent_key: agentKey,
                  dnas: [
                    {
                      path:
                        "/Users/philipbeadle/holochain-rsm/elemental-chat/elemental-chat.dna.gz",
                      nick: "Elemental Chat"
                    }
                  ]
                })
                .then(app => {
                  const cellId = app.cell_data[0][0];
                  admin.activateApp({ app_id: APP_ID });
                  admin.attachAppInterface({ port: 0 }).then(appInterface => {
                    commit("setAppInterface", {
                      port: appInterface.port,
                      cellId
                    });
                    state.hcDb.agent.put(
                      {
                        port: appInterface.port,
                        cellId
                      },
                      "appInterface"
                    );
                    AppWebsocket.connect(
                      `ws://localhost:${appInterface.port}`
                    ).then(holochainClient => {
                      commit("setHolochainClient", holochainClient);
                    });
                  });
                });
            });
          });
        } else {
          commit("setAgentKey", agentKey);
          state.hcDb.agent.get("appInterface").then(appInterface => {
            commit("setAppInterface", {
              port: appInterface.port,
              cellId: appInterface.cellId
            });
            AppWebsocket.connect(`ws://localhost:${appInterface.port}`).then(
              holochainClient => {
                commit("setHolochainClient", holochainClient);
              }
            );
          });
        }
      });
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
  }
});
