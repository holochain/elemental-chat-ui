import Vue from "vue";
import Vuex from "vuex";
import elementalChat from "@/applications/ElementalChat/store/elementalChat";
import { AdminWebsocket, AppWebsocket } from "@holochain/conductor-api";

Vue.use(Vuex);
const ADMIN_PORT = 3301;
const APP_ID = "ElementalChat";
export default new Vuex.Store({
  state: {},
  getters: {
    agentKey: state => {
      if (state.agentKey === undefined) return undefined;

      const hash = new Uint8Array(new ArrayBuffer());
      const hash_type = new Uint8Array(state.agentKey.hash_type.split(","))
        .buffer;
      return { hash, hash_type };
    }
  },
  mutations: {
    initialiseStore(state) {
      if (localStorage.getItem("state-store")) {
        this.replaceState(
          Object.assign(state, JSON.parse(localStorage.getItem("state-store")))
        );
        delete state.holochainClient;
        state.agentKey = localStorage.getItem("agentKey");
      }
    },
    setAgentKey(state, payload) {
      console.log(payload);
      state.agentKey = payload;
    },
    setAppInterface(state, payload) {
      state.appInterface = payload;
    },
    setHolochainClient(state, payload) {
      state.holochainClient = payload;
    },
    zomeResult(state, payload) {
      state.zomeResult = payload;
    }
  },
  actions: {
    initialiseAgent: async ({ commit, state }) => {
      if (state.agentKey === undefined) {
        const admin = await AdminWebsocket.connect(
          `ws://localhost:${ADMIN_PORT}`
        );
        const agentKey = await admin.generateAgentPubKey();
        commit("setAgentKey", {
          hashBuffer: agentKey.hash.buffer,
          hash_typeBuffer: agentKey.hash_type.buffer
        });
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
  }
});
