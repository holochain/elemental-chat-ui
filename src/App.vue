<template>
  <v-app>
    <v-app-bar app dense dark />
    <v-main>
      <v-dialog v-model="shouldDisplayNickPrompt" persistent max-width="320">
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
      <v-dialog v-model="error.shouldShow" persistent max-width="460">
        <v-card>
          <v-card-title class="headline">
            Hm... Something doesn't look right.
          </v-card-title>
          <v-card-text>{{ error.message }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="clearErrorMessage">
              Ok
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="shouldDisplayDisconnected" persistent max-width="460">
        <v-card>
          <v-card-title class="headline">
            Disconnected from conductor
          </v-card-title>
          <v-card-text>
            {{
              reconnectingIn === 0
                ? "Connecting..."
                : `Retrying in ${reconnectingIn} seconds...`
            }}</v-card-text
          >
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="retryNow">
              Retry Now
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
import { mapState, mapActions } from "vuex";
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
    ...mapActions("elementalChat", ["diplayErrorMessage", "setChannelPolling"]),
    ...mapActions(["setAgentHandle", "skipBackoff"]),
    agentHandleEntered() {
      if (this.internalAgentHandle === "") return;
      this.setAgentHandle(this.internalAgentHandle);
      this.dialog = false;
    },
    clearErrorMessage() {
      this.diplayErrorMessage({ message: "", shouldShow: false });
    },
    retryNow() {
      this.skipBackoff();
    }
  },
  computed: {
    ...mapState("elementalChat", ["error"]),
    ...mapState([
      "agentHandle",
      "needsHandle",
      "conductorDisconnected",
      "firstConnect",
      "reconnectingIn"
    ]),
    shouldDisplayNickPrompt() {
      return (
        this.needsHandle && !this.error.message && !this.conductorDisconnected
      );
    },
    shouldDisplayDisconnected() {
      console.log("UI this.conductorDisconnected", this.conductorDisconnected);
      return this.conductorDisconnected && !this.firstConnect;
    }
  },
  created() {
    this.$store.dispatch("initialiseStore");
    this.$vuetify.theme.dark = true;
  },
  mounted() {
    this.setChannelPolling();
  }
};
</script>
<style scoped>
#router {
  height: 100% !important;
}
</style>
