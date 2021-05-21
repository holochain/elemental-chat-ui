<template>
  <v-app>
    <v-app-bar app dense dark />
    <v-main>
      <v-dialog v-model="shouldDisplayNickPrompt" persistent max-width="320" role='dialog' aria-label="Agent Handle Dialog">
        <v-card>
          <v-card-title class="headline">
            <span>Tell us your nickname 😎</span>
          </v-card-title>
          <v-card-text
            >As a super simple way to see who wrote a message, your nickname or
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
              aria-label="Agent Handle Input"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="closeModal" aria-label="Close Handle Modal Button">
              Close
            </v-btn>
            <v-btn text @click="agentHandleEntered" aria-label="Submit Agent Handle Button">
              Let's Go
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        v-model="shouldDisplayHoloConnecting"
        persistent
        max-width="320"
        role='dialog'
        aria-label="Connecting to Holo Dialog"
      >
        <v-card>
          <v-card-title class="headline">
            Connecting to a HoloPort
          </v-card-title>
          <v-card-text>{{ holoConnectionMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn v-if="isChaperoneDisconnected" text @click="disconnectedHoloLogout" class="logout" aria-label="Logout with Holo">
              Clear Page Data
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="shouldShowErrorMessage" persistent max-width="460" role='dialog' aria-label="Error Message Dialog">
        <v-card>
          <v-card-title class="headline">
            Hm... Something doesn't look right.
          </v-card-title>
          <v-card-text>{{ errorMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn text @click="clearErrorMessage" aria-label="Clear Error Message Button">
              Ok
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="shouldDisplayHolochainConnecting" persistent max-width="460" role='dialog' aria-label="Reconnecting to Holochain Dialog">
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
            <v-btn text @click="retryNow" aria-label="Reconnect Now Button">
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
import { isHoloHosted, log } from '@/utils'
import ElementalChat from './ElementalChat.vue'

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
    ...mapActions('elementalChat', ['setChannelPolling', 'updateProfile']),
    ...mapActions('holochain', ['skipBackoff', 'holoLogout']),
    ...mapMutations(['setAgentHandle', 'setErrorMessage']),
    ...mapMutations('elementalChat', ['setNeedsHandle']),
    agentHandleEntered () {
      if (this.internalAgentHandle === '') return
      this.updateProfile(this.internalAgentHandle)
      this.dialog = false
    },
    closeModal () {
      this.setNeedsHandle(false)
    },
    clearErrorMessage () {
      this.setErrorMessage('')
    },
    retryNow () {
      this.skipBackoff()
    },
    disconnectedHoloLogout () {
      window.history.go(0)
      log('refreshed page')
      this.holoLogout()
      log('cleared page data')
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
    ...mapState('elementalChat', ['agentHandle', 'needsHandle']),
    ...mapState([
      'errorMessage'
    ]),
    shouldDisplayNickPrompt () {
      return (
        this.needsHandle &&
        !this.errorMessage &&
        !this.shouldDisplayHolochainConnecting &&
        !this.shouldDisplayHoloConnecting
      )
    },
    shouldDisplayHolochainConnecting () {
      return this.conductorDisconnected && !this.firstConnect && !this.isChaperoneDisconnected
    },
    shouldDisplayHoloConnecting () {
      if (!this.firstConnect) {
        // tech-debt: this follows the current state logic, assumes all agents must be logged in to particpate in app
        return (isHoloHosted() && (!this.isHoloSignedIn || this.isChaperoneDisconnected))
      }
    },
    shouldShowErrorMessage () {
      return this.errorMessage.length > 0
    },
    holoConnectionMessage () {
      if (this.isChaperoneDisconnected) {
        return "Can't connect to a HoloPort. Please check your internet connection and refresh this page."
      } else {
        return 'Connecting to a HoloPort...'
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
