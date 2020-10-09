<template>
  <v-app>
    <v-app-bar app dense dark />
    <v-main>
      <v-responsive height="100%">
        <transition name="fade">
          <router-view id="router" />
        </transition>
      </v-responsive>
    </v-main>
  </v-app>
</template>

<script>
import { mapActions } from "vuex";
export default {
  name: "App",
  components: {},
  methods: {
    ...mapActions(["initialiseAgent"])
  },
  created() {
    this.initialiseAgent();
    this.$vuetify.theme.dark = true;
  }
};
</script>
<style scoped>
#router {
  height: 100% !important;
}
</style>
