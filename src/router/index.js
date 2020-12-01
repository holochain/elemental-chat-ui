import Vue from "vue";
import VueRouter from "vue-router";

Vue.use(VueRouter);

const routes = [
  {
    path: "/",
    name: "Public Messages",
    component: () =>
      import("@/applications/ElementalChat/views/ElementalChat.vue")
  }
];

const router = new VueRouter({
  mode: "history",
  base: window.location.pathname,
  routes
});

export default router;
