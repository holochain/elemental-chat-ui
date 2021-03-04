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
              maxlength="20"
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
      <v-dialog
        v-model="shouldDisplayHoloConnecting"
        persistent
        max-width="320"
      >
        <v-card>
          <v-card-title class="headline">
            Connecting to HoloPort
          </v-card-title>
          <v-card-text>{{ holoConnectionMessage }}</v-card-text>
        </v-card>
      </v-dialog>
      <v-dialog v-model="shouldShowErrorMessage" persistent max-width="460">
        <v-card>
          <v-card-title class="headline">
            Hm... Something doesn't look right.
          </v-card-title>
          <v-card-text>{{ errorMessage }}</v-card-text>
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
            Establishing connection..
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
          <ElementalChat />
        </transition>
      </v-responsive>
    </v-main>
  </v-app>
</template>

<script>
import { mapState, mapActions, mapMutations } from 'vuex'
import { isHoloHosted } from '@/utils'
import ElementalChat from '@/ElementalChat.vue'

export default {
  name: 'App',
  components: {
    ElementalChat
  },
  data () {
    return {
      internalAgentHandle: '',
      dialog: false
    }
  },
  methods: {
    ...mapActions('elementalChat', ['setChannelPolling']),
    ...mapActions('holochain', ['skipBackoff']),
    ...mapMutations(['setAgentHandle', 'setErrorMessage']),
    agentHandleEntered () {
      if (this.internalAgentHandle === '') return
      this.setAgentHandle(this.internalAgentHandle)
      this.dialog = false
    },
    clearErrorMessage () {
      this.setErrorMessage('')
    },
    retryNow () {
      this.skipBackoff()
    }
  },
  computed: {
    ...mapState('holochain', [
      'conductorDisconnected',
      'firstConnect',
      'reconnectingIn',
      'isHoloSignedIn',
      'isChaperoneDisconnected'
    ]),
    ...mapState([
      'agentHandle',
      'needsHandle',
      'errorMessage'
    ]),
    shouldDisplayNickPrompt () {
      return (
        this.needsHandle &&
        !this.errorMessage &&
        !this.conductorDisconnected &&
        !this.shouldDisplayHoloConnecting
      )
    },
    shouldDisplayDisconnected () {
      return this.conductorDisconnected && !this.firstConnect
    },
    shouldDisplayHoloConnecting () {
      return (
        isHoloHosted() && (!this.isHoloSignedIn || this.isChaperoneDisconnected)
      )
    },
    shouldShowErrorMessage () {
      return this.errorMessage.length > 0
    },
    holoConnectionMessage () {
      if (this.isChaperoneDisconnected) {
        return "Can't find HoloPort. Please check your internet connection and refresh this page."
      } else {
        return 'Connecting to HoloPort...'
      }
    }
  },
  created () {
    this.$store.dispatch('initializeStore')
    this.$vuetify.theme.dark = true
  },
  mounted () {
    this.setChannelPolling()
  }
}
</script>
<style scoped>
#router {
  height: 100% !important;
}
</style>
