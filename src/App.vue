<template>
  <v-app>
    <v-app-bar app dense dark />
    <v-main>
      <v-dialog v-model="needHandle" persistent max-width="320">
        <v-card>
          <v-card-title class="headline">
            Tell us your nick name 😎
          </v-card-title>
          <v-card-text
            >As a super simple way to see who wrote a message your nick name or
            handle will be prepended to your messages.</v-card-text
          >
          <v-card-text>
            <v-text-field
              v-model="internalAgentHandle"
              label="Enter your handle"
              hint="This will be added to your messages"
              dark
              outlined
              full-width
              @keydown.enter="agentHandleEntered"
              append-icon="mdi-face-agent"
              @click:append="agentHandleEntered"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="agentHandleEntered">
              Let's Go
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-responsive height="100%">
        <transition name="fade">
          <router-view id="router" />
        </transition>
      </v-responsive>
    </v-main>
  </v-app>
</template>

<script>
import { mapState, mapActions, mapMutations } from "vuex";
export default {
  name: "App",
  components: {},
  data() {
    return {
      internalAgentHandle: "",
      dialog: false
    };
  },
  methods: {
    ...mapActions(["initialiseAgent"]),
    ...mapMutations(["setAgentHandle"]),
    agentHandleEntered() {
      this.setAgentHandle(this.internalAgentHandle);
      this.dialog = false;
    }
  },
  computed: {
    ...mapState(["agentHandle", "needsHandle"]),
    needHandle() {
      return this.needsHandle;
    }
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
