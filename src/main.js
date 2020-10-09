import Vue from "vue";
import App from "./App.vue";
import "./registerServiceWorker";
import router from "./router";
import store from "./store";
import vuetify from "./plugins/vuetify";

Vue.config.productionTip = false;
store.subscribe((mutation, state) => {
  console.log(mutation);
  localStorage.setItem("state-store", JSON.stringify(state));
});
new Vue({
  router,
  store,
  beforeCreate() {
    this.$store.commit("initialiseStore");
  },
  vuetify,
  render: h => h(App)
}).$mount("#app");
