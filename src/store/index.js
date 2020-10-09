import Vue from "vue";
import Vuex from "vuex";
import elementalChat from "@/applications/ElementalChat/store/elementalChat";
import { AdminWebsocket, AppWebsocket } from "@holochain/conductor-api";
import { persistencePlugin } from "./persistencePlugin";
import { getPersistedState } from "./stateMapper";

Vue.use(Vuex);
const ADMIN_PORT = 3301;
const APP_ID = "ElementalChat";
export default new Vuex.Store({
  state: {},
  mutations: {
    initialiseStore(state) {
      getPersistedState("setAgentKey").then(
        agentKey => (state.agentKey = agentKey)
      );
      getPersistedState("setAppInterface").then(
        appInterface => (state.appInterface = appInterface)
      );
      console.log(state);
    },
    setAgentKey(state, payload) {
      state.agentKey = payload;
    },
    setAppInterface(state, payload) {
      state.appInterface = payload;
    },
    setHolochainClient(state, payload) {
      state.holochainClient = payload;
    }
  },
  actions: {
    initialiseAgent: async ({ commit, state }) => {
      console.log(state);
      if (state.agentKey === undefined) {
        const admin = await AdminWebsocket.connect(
          `ws://localhost:${ADMIN_PORT}`
        );
        const agentKey = await admin.generateAgentPubKey();
        commit("setAgentKey", agentKey);
        const app = await admin.installApp({
          app_id: APP_ID,
          agent_key: agentKey,
          dnas: [
            {
              path:
                "/Users/philipbeadle/holochain-rsm/elemental-chat/elemental-chat.dna.gz",
              nick: "Elemental Chat"
            }
          ]
        });
        const cellId = app.cell_data[0][0];
        await admin.activateApp({ app_id: APP_ID });
        const { port } = await admin.attachAppInterface({ port: 0 });
        commit("setAppInterface", { port, cellId });
        const client = await AppWebsocket.connect(`ws://localhost:${port}`);
        commit("setHolochainClient", client);
      } else {
        const client = await AppWebsocket.connect(
          `ws://localhost:${state.appInterface.port}`
        );
        commit("setHolochainClient", client);
      }
    }
  },
  modules: {
    elementalChat
  },
  plugins: [persistencePlugin]
});
